/**
 * Extracts the product subject ("niche") from the NAME of the reference folder,
 * e.g. "kinusaiga turtle pattern - K7" -> "Turtle", "K53 kinusaiga unicorn" -> "Unicorn".
 * The folder itself is never opened.
 */

// Matches "kinusaiga" plus obvious spelling variants: "kino saiga", "kinu-saiga", "kinusaiga", "kinusaga"...
const KINU = String.raw`k[iy]n[ou]\s?-?\s?sa[iy]?\s?ga`;
export const KINU_RE = new RegExp(String.raw`(^|[^a-z])${KINU}([^a-z]|$)`, 'i');

const ID_TOKEN = /(^|[^a-z0-9])k\s?-?\s?(\d+)(?![a-z0-9])/gi;
const PATTERN_WORD = String.raw`pat+e?r+n\w*`; // pattern, patterns, patternn, patern
const GENERIC_TRAILING = /\s+(templates?|designs?|art|patterns?|pdf|png|printable|free)$/i;
const GENERIC_LEADING = /^(free|printable|the|a)\s+/i;

export interface NicheResult {
  niche: string | null;
  method: 'between' | 'after' | 'none';
  idInName: string | null;
  problems: string[];
}

export function isReferenceFolderName(name: string): boolean {
  return KINU_RE.test(name);
}

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.split('-').map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p)).join('-'))
    .join(' ');
}

export function extractNiche(folderName: string): NicheResult {
  const problems: string[] = [];
  let name = folderName.replace(/_/g, ' ');

  const ids = new Set<string>();
  for (const m of name.matchAll(ID_TOKEN)) ids.add(`K${parseInt(m[2], 10)}`);
  if (ids.size > 1) problems.push(`Folder name contains several product IDs (${[...ids].join(', ')}).`);
  const idInName = ids.size === 1 ? [...ids][0] : null;

  name = name
    .replace(ID_TOKEN, '$1 ')
    .replace(/[–—\-|:;,.()[\]{}#+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let raw: string | null = null;
  let method: NicheResult['method'] = 'none';

  const between = new RegExp(String.raw`(?:^|\s)${KINU}\s+(.+?)\s+${PATTERN_WORD}(?:\s|$)`, 'i').exec(name);
  if (between) {
    raw = between[1];
    method = 'between';
  } else {
    const after = new RegExp(String.raw`(?:^|\s)${KINU}\s+(.+)$`, 'i').exec(name);
    if (after) {
      raw = after[1];
      method = 'after';
    }
  }

  if (raw) {
    let prev = '';
    while (prev !== raw) {
      prev = raw;
      raw = raw.replace(GENERIC_TRAILING, '').replace(GENERIC_LEADING, '').trim();
    }
    if (new RegExp(String.raw`^${PATTERN_WORD}$`, 'i').test(raw)) raw = '';
  }

  if (!raw) {
    problems.push(`Could not find a subject after "Kinusaiga" in "${folderName}".`);
    return { niche: null, method: 'none', idInName, problems };
  }
  if (/\d/.test(raw)) problems.push(`Subject "${raw}" contains digits - please review.`);
  if (!/^[\p{L}' &-]+$/u.test(raw.replace(/\d/g, ''))) problems.push(`Subject "${raw}" contains unusual characters.`);
  if (raw.split(' ').length > 6) problems.push(`Subject "${raw}" is unusually long - please review.`);

  return { niche: titleCase(raw), method, idInName, problems };
}
