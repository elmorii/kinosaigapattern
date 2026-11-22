import fs from 'node:fs';
import path from 'node:path';
import type { Catalog } from '../src/lib/types.ts';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const CATALOG_PATH = path.join(PROJECT_ROOT, 'src/data/catalog.json');

// Cloudflare Pages Free Tier Limits
const CF_MAX_FILES = 20000;
const CF_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MiB

async function main() {
  console.log('🔎 Verifying production build in dist/ for Cloudflare Pages Free ...');

  if (!fs.existsSync(DIST_DIR)) {
    throw new Error('dist/ directory does not exist. Run "npm run build" first.');
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8')) as Catalog;
  const errors: string[] = [];

  // Gather all files
  const walk = (dir: string, fileList: { path: string; size: number }[] = []) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const p = path.join(dir, file);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        walk(p, fileList);
      } else {
        fileList.push({ path: p, size: stat.size });
      }
    }
    return fileList;
  };

  const allDistFiles = walk(DIST_DIR);

  console.log(`📦 Total generated files: ${allDistFiles.length.toLocaleString()} / ${CF_MAX_FILES.toLocaleString()} limit (${((allDistFiles.length / CF_MAX_FILES) * 100).toFixed(1)}% of Cloudflare Pages Free quota)`);

  // Check 1: Cloudflare Pages total file limit
  if (allDistFiles.length > CF_MAX_FILES) {
    errors.push(`Cloudflare Pages file limit exceeded: ${allDistFiles.length} files (maximum is ${CF_MAX_FILES}).`);
  }

  // Check 2: Cloudflare Pages single file size limit (25 MiB)
  let largestFile = { path: '', size: 0 };
  for (const f of allDistFiles) {
    if (f.size > largestFile.size) {
      largestFile = f;
    }
    if (f.size > CF_MAX_FILE_SIZE_BYTES) {
      const rel = path.relative(DIST_DIR, f.path);
      const mb = (f.size / (1024 * 1024)).toFixed(2);
      errors.push(`File exceeds Cloudflare Pages 25 MiB limit: ${rel} (${mb} MB)`);
    }
  }

  const largestMb = (largestFile.size / (1024 * 1024)).toFixed(3);
  const largestRel = path.relative(DIST_DIR, largestFile.path);
  console.log(`📏 Largest file: ${largestRel} (${largestMb} MB / 25 MiB limit)`);

  // Check 3: Check free downloads exist
  for (const p of catalog.products) {
    if (p.type === 'free' && p.download) {
      const expectedPath = path.join(DIST_DIR, p.download.url.replace(/^\//, ''));
      if (!fs.existsSync(expectedPath)) {
        errors.push(`Free download file missing for ${p.id}: ${expectedPath}`);
      }
    }
  }

  // Check 4: Security - Ensure NO paid PDF was accidentally copied to dist
  for (const f of allDistFiles) {
    const rel = path.relative(DIST_DIR, f.path).toLowerCase();
    if (rel.endsWith('.pdf')) {
      const isFree = catalog.products.some(
        (p) => p.type === 'free' && p.download && path.normalize(p.download.url.replace(/^\//, '')).toLowerCase() === rel
      );
      if (!isFree) {
        errors.push(`CRITICAL SECURITY LEAK: Unauthorized PDF found in public dist: ${rel}`);
      }
    }
  }

  // Check 5: Check essential pages
  const essentialPages = [
    'index.html',
    'shop/index.html',
    'free-patterns/index.html',
    'about/index.html',
    'contact/index.html',
    '404.html',
    'sitemap-index.xml',
    'sitemap.xml',
    '_headers'
  ];
  for (const ep of essentialPages) {
    const p = path.join(DIST_DIR, ep);
    if (!fs.existsSync(p)) {
      errors.push(`Missing essential generated page or asset: ${ep}`);
    }
  }

  if (errors.length > 0) {
    console.error('❌ Verification failed:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  } else {
    console.log('✅ All checks passed! dist/ is clean, 100% compliant with Cloudflare Pages Free, secure, and ready for deployment.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
