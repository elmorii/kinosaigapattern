import path from 'node:path';
import fs from 'node:fs';
import * as ftp from 'basic-ftp';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const DIST_DIR = path.join(PROJECT_ROOT, 'dist');

async function main() {
  const host = process.env.FTP_HOST;
  const user = process.env.FTP_USER;
  const password = process.env.FTP_PASSWORD;
  const remoteDir = process.env.FTP_REMOTE_DIR || '/public_html';
  const secure = process.env.FTP_SECURE === 'true';

  if (!host || !user || !password) {
    console.error('❌ FTP credentials missing in environment / .env:');
    console.error('Please set FTP_HOST, FTP_USER, FTP_PASSWORD in your .env file.');
    process.exit(1);
  }

  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ dist/ directory not found. Please run "npm run build" first.');
    process.exit(1);
  }

  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    console.log(`Connecting to FTP host ${host}...`);
    await client.access({
      host,
      user,
      password,
      secure,
    });

    console.log(`Uploading ${DIST_DIR} to ${remoteDir}...`);
    await client.ensureDir(remoteDir);
    await client.clearWorkingDir();
    await client.uploadFromDir(DIST_DIR, remoteDir);

    console.log('✅ Deployment to Hostinger completed successfully!');
  } catch (err) {
    console.error('❌ FTP upload failed:', err);
    process.exit(1);
  } finally {
    client.close();
  }
}

main().catch(console.error);
