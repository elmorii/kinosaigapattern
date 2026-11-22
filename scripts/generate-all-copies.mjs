import fs from 'node:fs';
import path from 'node:path';

const A_TO_COPY_ROOT = 'C:/Users/m/Documents/A To Copy';
const COPIES_ROOT = 'C:/Users/m/Documents/A To Copy/Copies';

// Rules defined by the user:
// 1. K1 to K13: images 3, 5, 7, 8 (4 copies)
// 2. K14 to K22: images 2, 4, 6, 8 (4 copies)
// 3. K23 to K35: images 2, 4, 5, 7, 9 (5 copies)
// 4. K36 to K63: images 2, 4, 5, 7, 9 (5 copies)
// 5. K64 to K74 (active products in A To Copy up to K112): images 2, 4, 5, 7, 8 (5 copies)
const groups = [
  { name: 'Group 1 (K1-K13)', range: [1, 13], images: [3, 5, 7, 8] },
  { name: 'Group 2 (K14-K22)', range: [14, 22], images: [2, 4, 6, 8] },
  { name: 'Group 3 (K23-K35)', range: [23, 35], images: [2, 4, 5, 7, 9] },
  { name: 'Group 4 (K36-K63)', range: [36, 63], images: [2, 4, 5, 7, 9] },
  { name: 'Group 5 (K64-K112)', range: [64, 112], images: [2, 4, 5, 7, 8] },
];

fs.mkdirSync(COPIES_ROOT, { recursive: true });

function copyProduct(parentId, copyId, srcDir, imgDirName, targetImgNum) {
  const destDir = path.join(COPIES_ROOT, copyId);
  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === imgDirName) {
        // Inner image directory: create as copyId
        const destImgDir = path.join(destDir, copyId);
        fs.mkdirSync(destImgDir, { recursive: true });

        const allImages = fs.readdirSync(srcPath).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
        const targetImgFile = `${targetImgNum}.png`;
        const primaryImgFile = `1.png`;

        for (const img of allImages) {
          const srcImgFile = path.join(srcPath, img);
          let destFileName = img;

          if (img === targetImgFile) {
            destFileName = primaryImgFile; // swap target to become 1.png
          } else if (img === primaryImgFile) {
            destFileName = targetImgFile; // swap original 1.png to target
          }

          fs.copyFileSync(srcImgFile, path.join(destImgDir, destFileName));
        }
      } else {
        // Other subdirectories (e.g. niche template folder: "kinusaiga horse pattern - K1")
        const newDirName = entry.name.replace(new RegExp(`\\b${parentId}\\b`, 'g'), copyId);
        const destSubDir = path.join(destDir, newDirName);
        fs.cpSync(srcPath, destSubDir, { recursive: true });
      }
    } else if (entry.isFile()) {
      // PDF pattern file or other companion assets
      let newFileName = entry.name;
      if (entry.name.toLowerCase().endsWith('.pdf') && entry.name.includes('pattern file')) {
        newFileName = `${copyId} pattern file.pdf`;
      } else {
        newFileName = entry.name.replace(new RegExp(`\\b${parentId}\\b`, 'g'), copyId);
      }
      fs.copyFileSync(srcPath, path.join(destDir, newFileName));
    }
  }
}

console.log('====================================================');
console.log('🚀 Starting Generation of All Product Copies');
console.log(`📂 Destination: ${COPIES_ROOT}`);
console.log('====================================================');

let generatedCount = 0;
let skippedCount = 0;

for (const group of groups) {
  const [start, end] = group.range;
  console.log(`\n▶ Processing ${group.name}...`);

  for (let i = start; i <= end; i++) {
    const parentId = `K${i}`;
    const srcDir = path.join(A_TO_COPY_ROOT, parentId);

    if (!fs.existsSync(srcDir)) {
      // Products like K2, K8 that were removed or not present in A To Copy
      skippedCount += group.images.length;
      continue;
    }

    // Find inner image directory (named K<num>, or having 1.png)
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    let imgDir = entries.find(
      (e) => e.isDirectory() && (e.name.toUpperCase() === parentId.toUpperCase() || e.name.toLowerCase() === `${i}k`)
    );

    if (!imgDir) {
      for (const e of entries) {
        if (e.isDirectory()) {
          const subP = path.join(srcDir, e.name);
          const subFiles = fs.readdirSync(subP);
          if (subFiles.includes('1.png')) {
            imgDir = e;
            break;
          }
        }
      }
    }

    if (!imgDir) {
      console.warn(`⚠️ ${parentId}: No inner image directory found. Skipping.`);
      skippedCount += group.images.length;
      continue;
    }

    const imgDirPath = path.join(srcDir, imgDir.name);
    const existingImgs = fs.readdirSync(imgDirPath).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));

    for (const targetImgNum of group.images) {
      const copyId = `${parentId}_${targetImgNum}`;
      const targetImgFile = `${targetImgNum}.png`;

      if (!existingImgs.includes(targetImgFile)) {
        console.warn(`⚠️ ${parentId}: Missing ${targetImgFile}. Skipping ${copyId}.`);
        skippedCount++;
        continue;
      }

      copyProduct(parentId, copyId, srcDir, imgDir.name, targetImgNum);
      generatedCount++;

      if (generatedCount % 25 === 0) {
        console.log(`   Generated ${generatedCount} copies so far...`);
      }
    }
  }
}

console.log('\n====================================================');
console.log(`✅ Copy generation complete!`);
console.log(`   Total successfully generated: ${generatedCount} copies`);
console.log(`   Total skipped: ${skippedCount}`);
console.log(`   Destination directory: ${COPIES_ROOT}`);
console.log('====================================================');
