import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const RESOURCES_ROOT = path.join(PROJECT_ROOT, 'resources');

const userDocs = process.env.USERPROFILE
  ? path.join(process.env.USERPROFILE, 'Documents')
  : path.join(process.env.HOME || '', 'Documents');

const A_TO_COPY_ROOT = path.join(userDocs, 'A To Copy');

const parents = [
  { id: 'K1', src: path.join(A_TO_COPY_ROOT, 'K1') },
  { id: 'K2', src: path.join(A_TO_COPY_ROOT, '_removed/K2') },
  { id: 'K3', src: path.join(A_TO_COPY_ROOT, 'K3') },
  { id: 'K4', src: path.join(A_TO_COPY_ROOT, 'K4') },
  { id: 'K5', src: path.join(A_TO_COPY_ROOT, 'K5') },
  { id: 'K6', src: path.join(A_TO_COPY_ROOT, 'K6') },
  { id: 'K7', src: path.join(A_TO_COPY_ROOT, 'K7') },
  { id: 'K8', src: path.join(A_TO_COPY_ROOT, '_removed/K8') },
  { id: 'K9', src: path.join(A_TO_COPY_ROOT, 'K9') },
  { id: 'K10', src: path.join(A_TO_COPY_ROOT, 'K10') },
  { id: 'K11', src: path.join(A_TO_COPY_ROOT, 'K11') },
  { id: 'K12', src: path.join(A_TO_COPY_ROOT, 'K12') },
];

console.log('==================================================');
console.log('🚀 Creating 36 KC Copies for Free Patterns K1-K12');
console.log('==================================================');

let copyIndex = 1;

for (const parent of parents) {
  if (!fs.existsSync(parent.src)) {
    console.error(`❌ Parent directory not found: ${parent.src}`);
    continue;
  }

  const entries = fs.readdirSync(parent.src, { withFileTypes: true });
  const subDirs = entries.filter((e) => e.isDirectory());
  const subFiles = entries.filter((e) => e.isFile());

  const refDir = subDirs.find((d) => d.name.toLowerCase().includes('kinusaiga'));
  const num = parseInt(parent.id.replace(/\D/g, ''), 10);
  const imgDir = subDirs.find((d) => {
    const n = d.name.toLowerCase().replace(/\s+/g, '');
    return n === `${num}k` || n === `k${num}`;
  });

  const pdfFile = subFiles.find(
    (f) => f.name.toLowerCase().endsWith('.pdf') && f.name.toLowerCase().includes('pattern')
  ) || subFiles.find((f) => f.name.toLowerCase().endsWith('.pdf'));

  if (!refDir || !imgDir || !pdfFile) {
    console.error(`❌ Incomplete parent structure in ${parent.id}`, {
      refDir: !!refDir,
      imgDir: !!imgDir,
      pdfFile: !!pdfFile,
    });
    continue;
  }

  const parentImgPath = path.join(parent.src, imgDir.name);
  const parentPdfPath = path.join(parent.src, pdfFile.name);
  const allImages = fs.readdirSync(parentImgPath).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));

  for (const targetImgNum of [3, 7, 8]) {
    const newId = `KC${String(copyIndex).padStart(3, '0')}`;
    console.log(`Creating ${newId} (from ${parent.id}, first image: ${targetImgNum}.png)...`);

    // Target destinations: both in resources/ and in A To Copy/
    const targetDirs = [
      path.join(RESOURCES_ROOT, newId),
      path.join(A_TO_COPY_ROOT, newId),
    ];

    for (const targetDir of targetDirs) {
      fs.mkdirSync(targetDir, { recursive: true });

      // 1. Empty niche folder
      const targetRefDir = path.join(targetDir, refDir.name);
      if (!fs.existsSync(targetRefDir)) {
        fs.mkdirSync(targetRefDir, { recursive: true });
      }

      // 2. Image folder named after newId
      const targetImgDir = path.join(targetDir, newId);
      fs.mkdirSync(targetImgDir, { recursive: true });

      const targetImgFile = `${targetImgNum}.png`;
      const primaryImgFile = `1.png`;

      for (const img of allImages) {
        const srcFile = path.join(parentImgPath, img);
        let destFileName = img;

        if (img === targetImgFile) {
          destFileName = primaryImgFile; // swap target to become 1.png!
        } else if (img === primaryImgFile) {
          destFileName = targetImgFile; // swap original 1.png to become target number!
        }

        const destFile = path.join(targetImgDir, destFileName);
        fs.copyFileSync(srcFile, destFile);
      }

      // 3. Free download PDF
      const destPdf = path.join(targetDir, pdfFile.name);
      fs.copyFileSync(parentPdfPath, destPdf);
    }

    copyIndex++;
  }
}

console.log(`\n✅ Finished creating ${copyIndex - 1} KC products!`);
