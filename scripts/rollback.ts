import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const BACKUPS_DIR = path.join(PROJECT_ROOT, 'backups');

async function main() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    console.log('No backups found.');
    return;
  }

  const entries = fs.readdirSync(BACKUPS_DIR).filter((f) => f.startsWith('backup-')).sort().reverse();
  if (entries.length === 0) {
    console.log('No backups found.');
    return;
  }

  const latest = entries[0];
  const latestPath = path.join(BACKUPS_DIR, latest);
  console.log(`Restoring from latest backup: ${latest}`);

  fs.cpSync(latestPath, PROJECT_ROOT, { recursive: true });
  console.log('✅ Rollback complete. Run "npm run build" to re-generate.');
}

main().catch(console.error);
