import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { extractNiche, titleCase } from './lib/niche.js';

const API_KEY = 'apik_hIf4QWjrfLcp9_C7934980_C_923acc6c6d844969bf9d22efcc382452d598591c61d4cafa80a5c79d727212';
const ACCOUNT_ID = 'biz_ltMSjNnc3LuiD8';
const SOURCE_DIR = 'C:\\Users\\m\\Documents\\A To Copy';
const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const OUTPUT_JSON = path.join(PROJECT_ROOT, 'data/whop-products.json');
const OUTPUT_CSV = path.join(PROJECT_ROOT, 'data/whop-mapping.csv');
const RESOURCES_DIR = path.join(PROJECT_ROOT, 'resources');

const FREE_IDS = new Set(['K3', 'K7', 'K11']);

interface WhopRecord {
  productId: string;
  title: string;
  niche: string;
  whopProductId: string;
  whopPlanId: string;
  checkoutUrl: string;
  pdfFileId: string;
  pdfUrl: string;
  imageFileId: string;
  imageUrl: string;
  uploadedAt: string;
}

// Load existing progress if any
let existingRecords: Record<string, WhopRecord> = {};
if (fs.existsSync(OUTPUT_JSON)) {
  try {
    const raw = JSON.parse(fs.readFileSync(OUTPUT_JSON, 'utf8'));
    if (Array.isArray(raw)) {
      for (const r of raw) existingRecords[r.productId] = r;
    } else {
      existingRecords = raw;
    }
  } catch {}
}

async function uploadFileToWhop(filename: string, contentType: string, buffer: Buffer): Promise<{ id: string; url: string }> {
  const res = await fetch('https://api.whop.com/api/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filename,
      content_type: contentType,
      size: buffer.length
    })
  });
  if (!res.ok) {
    throw new Error(`Failed to create file record: ${res.status} ${await res.text()}`);
  }
  const fileData = await res.json();

  const putRes = await fetch(fileData.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: buffer
  });
  if (!putRes.ok) {
    throw new Error(`Failed to upload file bytes to S3: ${putRes.status}`);
  }

  for (let attempt = 0; attempt < 12; attempt++) {
    await new Promise((r) => setTimeout(r, 1000));
    const checkRes = await fetch(`https://api.whop.com/api/v1/files/${fileData.id}`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      if (checkData.upload_status === 'ready') {
        return { id: checkData.id, url: checkData.url };
      }
    }
  }

  return { id: fileData.id, url: fileData.url || '' };
}

function saveState() {
  const recordsList = Object.values(existingRecords);
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(recordsList, null, 2), 'utf8');

  const csvRows = ['product_id,product_title,whop_product_id,whop_plan_id,checkout_url,pdf_file_id'];
  for (const r of recordsList) {
    csvRows.push(`"${r.productId}","${r.title}","${r.whopProductId}","${r.whopPlanId}","${r.checkoutUrl}","${r.pdfFileId}"`);
  }
  fs.writeFileSync(OUTPUT_CSV, csvRows.join('\n'), 'utf8');
}

async function run() {
  const entries = fs.readdirSync(SOURCE_DIR, { withFileTypes: true });
  const kDirs = entries
    .filter((d) => d.isDirectory() && /^k\d+$/i.test(d.name))
    .map((d) => d.name)
    .sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10))
    .filter((k) => !FREE_IDS.has(k.toUpperCase()));

  console.log('==================================================');
  console.log(`🚀 Whop Catalog Uploader`);
  console.log(`📦 Found ${kDirs.length} paid K products to process`);
  console.log(`🚫 Ignored Free IDs: ${Array.from(FREE_IDS).join(', ')}`);
  console.log('==================================================\n');

  let successCount = 0;
  let skippedCount = 0;
  let failCount = 0;

  for (let i = 0; i < kDirs.length; i++) {
    const kId = kDirs[i].toUpperCase();
    const productDir = path.join(SOURCE_DIR, kDirs[i]);

    if (existingRecords[kId] && existingRecords[kId].checkoutUrl) {
      console.log(`[${i + 1}/${kDirs.length}] ⏭️  ${kId} already uploaded (${existingRecords[kId].title})`);
      skippedCount++;
      continue;
    }

    try {
      console.log(`[${i + 1}/${kDirs.length}] ⏳ Processing ${kId}...`);
      const items = fs.readdirSync(productDir, { withFileTypes: true });

      // Niche & Title
      const nicheFolder = items.find((it) => it.isDirectory() && it.name.toLowerCase().includes('kinusaiga'));
      const extracted = nicheFolder ? extractNiche(nicheFolder.name).niche : null;
      const cleanNiche = titleCase(extracted || kId);
      const title = `${kId} Kinusaiga ${cleanNiche} Pattern`;

      // PDF
      const pdfItem = items.find((it) => it.isFile() && it.name.toLowerCase().endsWith('.pdf'));
      if (!pdfItem) {
        throw new Error(`No PDF pattern file found in ${productDir}`);
      }
      const pdfPath = path.join(productDir, pdfItem.name);
      const pdfBuf = fs.readFileSync(pdfPath);

      // Image 1
      const imgDir = path.join(productDir, kDirs[i]);
      let imgPath = path.join(imgDir, '1.png');
      if (!fs.existsSync(imgPath)) {
        imgPath = path.join(imgDir, '1.jpg');
      }
      if (!fs.existsSync(imgPath)) {
        const anyImg = fs.readdirSync(imgDir).find((f) => /\.(png|jpe?g)$/i.test(f));
        if (anyImg) imgPath = path.join(imgDir, anyImg);
      }
      if (!fs.existsSync(imgPath)) {
        throw new Error(`No primary image found in ${imgDir}`);
      }

      // Optimize image to ~1200px JPEG
      const imgBuf = await sharp(imgPath)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Upload PDF
      const pdfResult = await uploadFileToWhop(pdfItem.name, 'application/pdf', pdfBuf);

      // Upload Image
      const imgResult = await uploadFileToWhop(`${kId}-cover.jpg`, 'image/jpeg', imgBuf);

      // Create Product on Whop
      const prodRes = await fetch('https://api.whop.com/api/v1/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          account_id: ACCOUNT_ID,
          title,
          description: `Instant download printable Kinusaiga Japanese fabric art pattern template for "${cleanNiche}". Includes numbered pattern pieces, cutting guides, color suggestions, and printable craft instructions.`,
          visibility: 'visible',
          gallery_images: [{ id: imgResult.id }],
          metadata: {
            product_id: kId,
            niche: cleanNiche,
            pdf_file_id: pdfResult.id,
            pdf_url: pdfResult.url
          }
        })
      });

      if (!prodRes.ok) {
        throw new Error(`Whop create product error: ${prodRes.status} ${await prodRes.text()}`);
      }
      const prodData = await prodRes.json();

      // Create Plan ($1.99 one-time)
      const planRes = await fetch('https://api.whop.com/api/v1/plans', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company_id: ACCOUNT_ID,
          product_id: prodData.id,
          initial_price: 1.99,
          currency: 'usd',
          billing_type: 'one_time'
        })
      });

      if (!planRes.ok) {
        throw new Error(`Whop create plan error: ${planRes.status} ${await planRes.text()}`);
      }
      const planData = await planRes.json();

      const record: WhopRecord = {
        productId: kId,
        title,
        niche: cleanNiche,
        whopProductId: prodData.id,
        whopPlanId: planData.id,
        checkoutUrl: planData.purchase_url,
        pdfFileId: pdfResult.id,
        pdfUrl: pdfResult.url,
        imageFileId: imgResult.id,
        imageUrl: imgResult.url,
        uploadedAt: new Date().toISOString()
      };

      existingRecords[kId] = record;
      saveState();

      // Write to resources directory
      const targetResDir = path.join(RESOURCES_DIR, kId);
      if (fs.existsSync(targetResDir)) {
        fs.writeFileSync(path.join(targetResDir, 'whop-embed.txt'), planData.purchase_url, 'utf8');
      }

      console.log(`   ✅ Created: "${title}" | URL: ${planData.purchase_url}`);
      successCount++;

      // Small delay between products to be courteous to Whop rate limits
      await new Promise((r) => setTimeout(r, 600));
    } catch (err: any) {
      console.error(`   ❌ Failed ${kId}:`, err.message);
      failCount++;
    }
  }

  console.log('\n==================================================');
  console.log('🎉 Whop Upload Run Finished!');
  console.log(`✅ Newly Uploaded: ${successCount}`);
  console.log(`⏭️  Previously Skipped: ${skippedCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📄 Saved mapping to: ${OUTPUT_CSV}`);
  console.log('==================================================');
}

run().catch((e) => {
  console.error('Fatal upload error:', e);
  process.exit(1);
});
