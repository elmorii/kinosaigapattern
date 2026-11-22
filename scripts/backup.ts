import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const BACKUPS_DIR = path.join(PROJECT_ROOT, 'backups');

async function main() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const targetDir = path.join(BACKUPS_DIR, `backup-${ts}`);
  fs.mkdirSync(targetDir, { recursive: true });

  const items = ['src/data/catalog.json', 'data', 'shop.config.json'];
  for (const item of items) {
    const src = path.join(PROJECT_ROOT, item);
    const dest = path.join(targetDir, item);
    if (fs.existsSync(src)) {
      fs.cpSync(src, dest, { recursive: true });
    }
  }

  console.log(`✅ Backup created at: ${targetDir}`);
}

main().catch(console.error);
