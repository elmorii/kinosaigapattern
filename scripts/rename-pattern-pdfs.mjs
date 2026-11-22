// Utility to standardize and rename all product PDF files in 'A To Copy'
// Pattern: [ID] pattern file.pdf (e.g., "K1 pattern file.pdf", "K2 pattern file.pdf", etc.)

import fs from 'fs';
import path from 'path';

const BASE_DIR = 'C:/Users/m/Documents/A To Copy';

export function renameAllPatternPdfs() {
  if (!fs.existsSync(BASE_DIR)) {
    console.error(`Base directory not found: ${BASE_DIR}`);
    return;
  }

  const entries = fs.readdirSync(BASE_DIR, { withFileTypes: true });
  const folders = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'))
    .sort((a, b) => {
      const numA = parseInt(a.name.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.name.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

  console.log(`Found ${folders.length} product folders in ${BASE_DIR}.\n`);

  let renamedCount = 0;
  let alreadyCorrectCount = 0;
  let skippedCount = 0;

  for (const folder of folders) {
    const folderPath = path.join(BASE_DIR, folder.name);
    const files = fs.readdirSync(folderPath);
    const pdfFiles = files.filter((f) => f.toLowerCase().endsWith('.pdf'));

    const expectedName = `${folder.name} pattern file.pdf`;
    const expectedPath = path.join(folderPath, expectedName);

    if (pdfFiles.length === 0) {
      console.warn(`[SKIP] No PDF found in folder: ${folder.name}`);
      skippedCount++;
      continue;
    }

    if (pdfFiles.length === 1) {
      const currentPdfName = pdfFiles[0];
      const currentPdfPath = path.join(folderPath, currentPdfName);

      if (currentPdfName === expectedName) {
        alreadyCorrectCount++;
        continue;
      }

      try {
        fs.renameSync(currentPdfPath, expectedPath);
        console.log(`[RENAMED] ${folder.name}: "${currentPdfName}" -> "${expectedName}"`);
        renamedCount++;
      } catch (err) {
        console.error(`[ERROR] Failed to rename in ${folder.name}:`, err.message);
      }
    } else {
      // Multiple PDFs in folder: find the primary pattern PDF or rename the match
      console.warn(`[WARN] Multiple PDFs (${pdfFiles.length}) in ${folder.name}: ${pdfFiles.join(', ')}`);
      const match = pdfFiles.find((f) => f.toLowerCase().includes('pattern') || f.toLowerCase().includes(folder.name.toLowerCase()));
      if (match && match !== expectedName) {
        const matchPath = path.join(folderPath, match);
        try {
          fs.renameSync(matchPath, expectedPath);
          console.log(`[RENAMED MULTI] ${folder.name}: "${match}" -> "${expectedName}"`);
          renamedCount++;
        } catch (err) {
          console.error(`[ERROR] Failed to rename multi in ${folder.name}:`, err.message);
        }
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`Renaming Summary:`);
  console.log(`- Successfully renamed: ${renamedCount}`);
  console.log(`- Already named correctly: ${alreadyCorrectCount}`);
  console.log(`- Skipped: ${skippedCount}`);
  console.log(`- Total product folders checked: ${folders.length}`);
  console.log(`========================================\n`);
}

renameAllPatternPdfs();
