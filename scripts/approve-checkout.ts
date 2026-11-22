import fs from 'node:fs';
import path from 'node:path';
import { loadApprovals, saveApprovals } from './lib/approvals.ts';
import { loadMappingSource, validateMapping } from './lib/checkout.ts';
import type { Catalog, ShopConfig } from '../src/lib/types.ts';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const CONFIG_PATH = path.join(PROJECT_ROOT, 'shop.config.json');
const CATALOG_PATH = path.join(PROJECT_ROOT, 'src/data/catalog.json');
const APPROVALS_PATH = path.join(PROJECT_ROOT, 'data/checkout-approvals.json');
const CACHE_DIR = path.join(PROJECT_ROOT, 'data/cache');

async function main() {
  console.log('🛡️  Payhip Checkout Approval Tool');

  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error('Please run npm run import first to generate the catalog.');
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8')) as Catalog;
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as ShopConfig;
  const approvalsData = loadApprovals(APPROVALS_PATH);

  const scannedIds = new Set(catalog.products.map((p) => p.id));
  const paidIds = new Set(catalog.products.filter((p) => p.type === 'paid').map((p) => p.id));

  const mappingSource = await loadMappingSource({
    root: PROJECT_ROOT,
    csvUrl: process.env.CHECKOUT_SHEET_CSV_URL || config.checkoutSheet.csvUrl,
    spreadsheetId: config.checkoutSheet.spreadsheetId,
    range: config.checkoutSheet.range,
    apiKey: process.env.GOOGLE_SHEETS_API_KEY || '',
    localCsvPath: config.checkoutSheet.localCsvPath,
    cacheFile: path.join(CACHE_DIR, 'checkout-mapping.csv'),
  });

  if (!mappingSource.text) {
    console.log('No checkout mapping available to approve.');
    return;
  }

  const { map, critical, warnings } = validateMapping(mappingSource.text, scannedIds, paidIds);

  if (critical.length > 0) {
    console.error('❌ Cannot approve links due to critical validation errors in sheet:');
    for (const c of critical) console.error(`  - ${c}`);
    return;
  }

  let newlyApproved = 0;
  for (const [id, item] of map) {
    if (approvalsData.approvals[id] !== item.code) {
      console.log(`Approving ${id} -> Payhip code: ${item.code}`);
      approvalsData.approvals[id] = item.code;
      newlyApproved++;
    }
  }

  saveApprovals(APPROVALS_PATH, approvalsData);
  console.log(`\n✅ Approved ${newlyApproved} link(s). Total approved: ${Object.keys(approvalsData.approvals).length}`);
  console.log('Run "npm run import" to update the catalog with approved links.');
}

main().catch((err) => {
  console.error('Error during approval:', err);
  process.exit(1);
});
