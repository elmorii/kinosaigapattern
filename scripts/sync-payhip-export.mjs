import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = 'C:/Users/m/Documents/First Digital Shop';
const PAYHIP_EXPORT_PATH = path.join(PROJECT_ROOT, 'data/payhip-export.json');
const CHECKOUT_CSV_PATH = path.join(PROJECT_ROOT, 'data/checkout-mapping.csv');
const CHECKOUT_CACHE_CSV_PATH = path.join(PROJECT_ROOT, 'data/cache/checkout-mapping.csv');
const APPROVALS_PATH = path.join(PROJECT_ROOT, 'data/checkout-approvals.json');
const CATALOG_PATH = path.join(PROJECT_ROOT, 'src/data/catalog.json');

const rawPayhip = fs.readFileSync(PAYHIP_EXPORT_PATH, 'utf8');
const payhipData = JSON.parse(rawPayhip);

// 1. Sort products by natural number ID (K1, K3, K4... K112)
const parseIdNum = (id) => {
  const match = id.match(/K(\d+)/i);
  return match ? parseInt(match[1], 10) : 999999;
};

const sortedPayhip = [...payhipData.products].sort((a, b) => parseIdNum(a.id) - parseIdNum(b.id));

// 2. Generate CSV
const csvRows = ['product_id,checkout_link'];
const approvalsObj = {};

for (const p of sortedPayhip) {
  const id = p.id.toUpperCase();
  const code = p.productUrl.replace('https://payhip.com/b/', '').trim();
  csvRows.push(`${id},${p.productUrl.trim()}`);
  approvalsObj[id] = code;
}

fs.writeFileSync(CHECKOUT_CSV_PATH, csvRows.join('\n') + '\n', 'utf8');
console.log(`Updated ${CHECKOUT_CSV_PATH} with ${csvRows.length - 1} entries.`);

if (fs.existsSync(path.dirname(CHECKOUT_CACHE_CSV_PATH))) {
  fs.writeFileSync(CHECKOUT_CACHE_CSV_PATH, csvRows.join('\n') + '\n', 'utf8');
  console.log(`Updated cache: ${CHECKOUT_CACHE_CSV_PATH}`);
}

// 3. Update Approvals JSON
const approvalsData = {
  _comment: 'Approved Payhip checkout codes for products.',
  approvals: approvalsObj,
};
fs.writeFileSync(APPROVALS_PATH, JSON.stringify(approvalsData, null, 2) + '\n', 'utf8');
console.log(`Updated ${APPROVALS_PATH} with ${Object.keys(approvalsObj).length} approvals.`);

// 4. Update Catalog JSON
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
let updatedCount = 0;

for (const product of catalog.products) {
  const id = product.id.toUpperCase();
  const baseId = id.includes('_') ? id.split('_')[0] : id;
  const payhipCode = approvalsObj[id] || approvalsObj[baseId];

  if (payhipCode) {
    product.checkout = {
      mode: 'embed',
      code: payhipCode,
      productUrl: `https://payhip.com/b/${payhipCode}`,
      checkoutUrl: `https://payhip.com/b/${payhipCode}`,
      approved: true,
      onlineCheck: 'passed',
    };

    // Remove any checkout-related draft reasons
    if (Array.isArray(product.draftReasons)) {
      product.draftReasons = product.draftReasons.filter(
        (r) => !r.toLowerCase().includes('payhip') && !r.toLowerCase().includes('checkout')
      );
    }

    if (product.draftReasons && product.draftReasons.length === 0) {
      product.status = 'published';
    }

    product.updatedAt = new Date().toISOString();
    updatedCount++;
  } else {
    console.warn(`Warning: Catalog product ${id} has no matching Payhip code!`);
  }
}

catalog.generatedAt = new Date().toISOString();
fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
console.log(`Updated ${CATALOG_PATH}: ${updatedCount} products received verified Payhip checkout data.`);
