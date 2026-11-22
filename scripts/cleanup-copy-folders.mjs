import fs from 'node:fs';
import path from 'node:path';

const COPIES_ROOT = 'C:/Users/m/Documents/A To Copy/Copies';
const FREE_PARENT_IDS = new Set(['K3', 'K7', 'K11']);

async function main() {
  console.log('🧹 Scanning copy folders in', COPIES_ROOT);
  const copyFolders = fs.readdirSync(COPIES_ROOT).filter((f) => {
    return fs.statSync(path.join(COPIES_ROOT, f)).isDirectory() && /^K\d+_\d+$/i.test(f);
  });

  console.log(`Found ${copyFolders.length} copy folders to clean up.`);

  let deletedFilesCount = 0;
  let deletedDirsCount = 0;
  let preservedPdfsCount = 0;

  for (const folder of copyFolders) {
    const folderPath = path.join(COPIES_ROOT, folder);
    const parentId = folder.split('_')[0].toUpperCase();
    const isFree = FREE_PARENT_IDS.has(parentId);

    const items = fs.readdirSync(folderPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(folderPath, item.name);

      if (item.isDirectory()) {
        if (item.name.toUpperCase() === folder.toUpperCase()) {
          // This is the image directory (e.g. K1_3) -> KEEP it!
          // Ensure inside it only contains the numbered images 1.png - 9.png
          const imgFiles = fs.readdirSync(itemPath);
          for (const f of imgFiles) {
            if (!/^\d+\.(png|jpe?g|webp)$/i.test(f)) {
              fs.unlinkSync(path.join(itemPath, f));
              deletedFilesCount++;
            }
          }
        } else if (item.name.toLowerCase().includes('kinusaiga') || item.name.toLowerCase().includes('pattern')) {
          // This is the niche folder -> empty its contents but keep the folder!
          const subContents = fs.readdirSync(itemPath);
          for (const sub of subContents) {
            const subPath = path.join(itemPath, sub);
            fs.rmSync(subPath, { recursive: true, force: true });
            deletedFilesCount++;
          }
        } else {
          // Any other unexpected directory -> remove
          fs.rmSync(itemPath, { recursive: true, force: true });
          deletedDirsCount++;
        }
      } else if (item.isFile()) {
        const lowerName = item.name.toLowerCase();
        if (lowerName.endsWith('.pdf')) {
          if (isFree) {
            preservedPdfsCount++;
            // Keep PDF for free patterns!
          } else {
            // Remove PDF for paid patterns!
            fs.unlinkSync(itemPath);
            deletedFilesCount++;
          }
        } else {
          // Remove all other files (mp4s, txt, extra chatgpt pngs, etc.)
          fs.unlinkSync(itemPath);
          deletedFilesCount++;
        }
      }
    }
  }

  console.log('✅ Cleanup Complete!');
  console.log(`- Deleted items/files: ${deletedFilesCount}`);
  console.log(`- Removed extra directories: ${deletedDirsCount}`);
  console.log(`- Preserved Free Pattern PDFs: ${preservedPdfsCount}`);
}

main().catch((err) => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
