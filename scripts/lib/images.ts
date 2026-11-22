import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { ImageVariant } from '../../src/lib/types.ts';

export interface OrderedImage {
  name: string;
  num: number | null; // leading number of the file name
  dup: number; // number in trailing parentheses, e.g. "1 (2).png" -> 2 (0 when absent)
}

/** Reads the intended order number from names like "1.png", "01.png", "2 (1).png", "3-edited.jpg", "image 4.png". */
export function parseImageOrder(fileName: string): OrderedImage {
  const stem = path.parse(fileName).name.trim();
  const lead = /^(\d+)/.exec(stem);
  const paren = /\((\d+)\)\s*$/.exec(stem);
  let num: number | null = lead ? parseInt(lead[1], 10) : null;
  if (num === null) {
    const any = /(\d+)/.exec(stem.replace(/\(\d+\)\s*$/, ''));
    if (any) num = parseInt(any[1], 10);
  }
  const dup = paren && !(lead && paren.index === 0) ? parseInt(paren[1], 10) : 0;
  return { name: fileName, num, dup };
}

/** Numeric (not alphabetical) ordering: 1, 2, ..., 9, 10. Files without numbers go last, alphabetically. */
export function sortImageFiles(files: string[]): { sorted: string[]; notes: string[]; primaryAmbiguous: boolean } {
  const parsed = files.map(parseImageOrder);
  parsed.sort((a, b) => {
    const an = a.num ?? Number.POSITIVE_INFINITY;
    const bn = b.num ?? Number.POSITIVE_INFINITY;
    if (an !== bn) return an - bn;
    if (a.dup !== b.dup) return a.dup - b.dup;
    return a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' });
  });
  const notes: string[] = [];
  let primaryAmbiguous = false;
  if (parsed.length) {
    const first = parsed[0];
    const ties = parsed.filter((p) => p.num === first.num && p.dup === first.dup);
    if (first.num === null) {
      primaryAmbiguous = true;
      notes.push(`No numbered image found; "${first.name}" was chosen alphabetically as the main image.`);
    } else if (ties.length > 1) {
      primaryAmbiguous = true;
      notes.push(`Several files could be the main image (${ties.map((t) => t.name).join(', ')}); "${first.name}" was chosen.`);
    } else if (first.num !== 1) {
      notes.push(`No image numbered 1; "${first.name}" (lowest number) is used as the main image.`);
    }
    const unnumbered = parsed.filter((p) => p.num === null).map((p) => p.name);
    if (unnumbered.length && first.num !== null) notes.push(`Unnumbered images placed last: ${unnumbered.join(', ')}.`);
  }
  return { sorted: parsed.map((p) => p.name), notes, primaryAmbiguous };
}

export interface ProcessedImage {
  width: number;
  height: number;
  variants: ImageVariant[];
}

/**
 * Creates optimized WebP copies of one source image. The source file is only READ.
 * Aspect ratio is always preserved (resize by width only, no cropping, no enlargement).
 */
export async function processImage(
  srcPath: string,
  outDir: string,
  publicDir: string,
  baseName: string,
  widths: number[],
  quality: number,
): Promise<ProcessedImage> {
  const input = await fs.promises.readFile(srcPath);
  const base = sharp(input, { failOn: 'none' }).rotate();
  const meta = await base.metadata();
  let ow = meta.width ?? 0;
  let oh = meta.height ?? 0;
  if ((meta.orientation ?? 1) >= 5) [ow, oh] = [oh, ow];
  if (!ow || !oh) throw new Error('Could not read image dimensions');

  const targets = [...new Set(widths.map((w) => Math.min(w, ow)))].sort((a, b) => a - b);
  const variants: ImageVariant[] = [];

  let allExist = true;
  for (const w of targets) {
    const file = `${baseName}-${w}.webp`;
    const targetFile = path.join(outDir, file);
    if (!fs.existsSync(targetFile) || fs.statSync(targetFile).size === 0) {
      allExist = false;
      break;
    }
  }

  for (const w of targets) {
    const file = `${baseName}-${w}.webp`;
    const targetFile = path.join(outDir, file);
    if (!allExist) {
      await base.clone().resize({ width: w, withoutEnlargement: true }).webp({ quality, effort: 4 }).toFile(targetFile);
    }
    variants.push({ width: w, src: toPublicUrl(targetFile, publicDir) });
  }
  const largest = targets[targets.length - 1];
  return { width: largest, height: Math.round((largest * oh) / ow), variants };
}

/** Social sharing image (JPEG is the most widely supported format for Open Graph). */
export async function processOgImage(srcPath: string, outDir: string, publicDir: string, baseName: string, width: number): Promise<string> {
  const file = `${baseName}-og.jpg`;
  const targetFile = path.join(outDir, file);
  if (!fs.existsSync(targetFile) || fs.statSync(targetFile).size === 0) {
    await sharp(srcPath, { failOn: 'none' })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(targetFile);
  }
  return toPublicUrl(targetFile, publicDir);
}

export function toPublicUrl(absFile: string, publicDir: string): string {
  return '/' + path.relative(publicDir, absFile).split(path.sep).join('/');
}

/** Runs async jobs with limited parallelism. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
