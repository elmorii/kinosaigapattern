import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const RESOURCES_ROOT = path.join(PROJECT_ROOT, 'resources');

// Source root: either KINUSAIGA_SOURCE_ROOT env var, or user's Documents/A To Copy
const userDocs = process.env.USERPROFILE
  ? path.join(process.env.USERPROFILE, 'Documents')
  : path.join(process.env.HOME || '', 'Documents');

const SOURCE_ROOT = (process.env.KINUSAIGA_SOURCE_ROOT || path.join(userDocs, 'A To Copy')).trim();

console.log('==================================================');
console.log('🔄 Kinusaiga Resources Synchronizer');
console.log(`📂 Source Directory:    ${SOURCE_ROOT}`);
console.log(`📁 Target Resources:   ${RESOURCES_ROOT}`);
console.log('==================================================');

if (!fs.existsSync(SOURCE_ROOT)) {
  console.error(`❌ Source directory does not exist: "${SOURCE_ROOT}"`);
  process.exit(1);
}

fs.mkdirSync(RESOURCES_ROOT, { recursive: true });

// Read existing checkout mappings if any
const mappingFile = path.join(PROJECT_ROOT, 'data/checkout-mapping.csv');
const checkoutMap = new Map<string, string>();
if (fs.existsSync(mappingFile)) {
  const lines = fs.readFileSync(mappingFile, 'utf8').split('\n');
  for (const line of lines) {
    const parts = line.split(',').map((p) => p.trim());
    if (parts.length >= 2 && parts[0] && parts[0] !== 'product_id') {
      checkoutMap.set(parts[0].toUpperCase(), parts[1]);
    }
  }
}

const entries = fs.readdirSync(SOURCE_ROOT, { withFileTypes: true });
const productDirs = entries
  .filter((e) => e.isDirectory() && e.name !== '_removed' && /^(k\d+|kc\d+)$/i.test(e.name))
  .sort((a, b) => {
    const na = parseInt(a.name.replace(/\D/g, ''), 10);
    const nb = parseInt(b.name.replace(/\D/g, ''), 10);
    return na - nb;
  });

console.log(`Found ${productDirs.length} product directories to synchronize.\n`);

let copiedDirsCount = 0;
let copiedImagesCount = 0;
let copiedPdfsCount = 0;

for (const dir of productDirs) {
  const id = dir.name.toUpperCase();
  const num = parseInt(dir.name.replace(/\D/g, ''), 10);
  const isFree = num <= 12;

  const srcProductPath = path.join(SOURCE_ROOT, dir.name);
  const targetProductPath = path.join(RESOURCES_ROOT, id);

  fs.mkdirSync(targetProductPath, { recursive: true });

  const subEntries = fs.readdirSync(srcProductPath, { withFileTypes: true });
  const subDirs = subEntries.filter((s) => s.isDirectory());
  const subFiles = subEntries.filter((s) => s.isFile());

  // 1. Empty niche folder (extracts niche name between "kinusaiga" and "pattern")
  const refDir = subDirs.find((d) => d.name.toLowerCase().includes('kinusaiga'));
  if (refDir) {
    const targetRefPath = path.join(targetProductPath, refDir.name);
    if (!fs.existsSync(targetRefPath)) {
      fs.mkdirSync(targetRefPath, { recursive: true });
      // Keep empty as requested!
    }
  }

  // 2. Image folder (with 1.png, 2.png, ...)
  const imgDir = subDirs.find((d) => {
    const n = d.name.toLowerCase().replace(/\s+/g, '');
    return n === `${num}k` || n === `k${num}`;
  });

  if (imgDir) {
    const srcImgDir = path.join(srcProductPath, imgDir.name);
    const targetImgDir = path.join(targetProductPath, imgDir.name);
    fs.mkdirSync(targetImgDir, { recursive: true });

    const imgFiles = fs.readdirSync(srcImgDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
    for (const f of imgFiles) {
      const srcFile = path.join(srcImgDir, f);
      const destFile = path.join(targetImgDir, f);
      if (!fs.existsSync(destFile) || fs.statSync(srcFile).size !== fs.statSync(destFile).size) {
        fs.copyFileSync(srcFile, destFile);
        copiedImagesCount++;
      }
    }
  }

  // 3. For free product: copy the PDF file
  if (isFree) {
    const pdfFile = subFiles.find(
      (f) => f.name.toLowerCase().endsWith('.pdf') && f.name.toLowerCase().includes('pattern')
    ) || subFiles.find((f) => f.name.toLowerCase().endsWith('.pdf'));

    if (pdfFile) {
      const srcPdf = path.join(srcProductPath, pdfFile.name);
      const destPdf = path.join(targetProductPath, pdfFile.name);
      if (!fs.existsSync(destPdf) || fs.statSync(srcPdf).size !== fs.statSync(destPdf).size) {
        fs.copyFileSync(srcPdf, destPdf);
        copiedPdfsCount++;
      }
    }
  }

  // 4. Payhip embed / checkout link for paid products
  if (checkoutMap.has(id)) {
    const payhipLink = checkoutMap.get(id)!;
    const embedTxtPath = path.join(targetProductPath, 'embed.txt');
    if (!fs.existsSync(embedTxtPath)) {
      fs.writeFileSync(embedTxtPath, payhipLink, 'utf8');
    }
  }

  copiedDirsCount++;
}

console.log('✅ Synchronization completed successfully!');
console.log(`📦 Synchronized ${copiedDirsCount} products in ${RESOURCES_ROOT}`);
console.log(`🖼️  Copied/verified preview images.`);
console.log(`📄 Copied/verified free pattern PDFs.`);
