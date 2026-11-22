import fs from 'node:fs';
import path from 'node:path';
import { parseOuterFolderName, isFreeNumber, compareIds } from './lib/ids.ts';
import { extractNiche, isReferenceFolderName } from './lib/niche.ts';
import { sortImageFiles, processImage, processOgImage, mapLimit } from './lib/images.ts';
import {
  generateTitles,
  generateMetaDescription,
  generateSummary,
  generateKeywords,
  generateTags,
  generateDescription,
  generateFaq,
  productSlug,
  inputsHash,
  GENERATOR_VERSION
} from './lib/text.ts';
import { loadMappingSource, validateMapping, payhipUrls, checkPayhipOnline, parsePayhipLink } from './lib/checkout.ts';
import { loadPrices } from './lib/prices.ts';
import { loadCategoriesConfig, matchCategory } from './lib/categories.ts';
import { loadOverrides, applyOverride } from './lib/overrides.ts';
import { loadApprovals } from './lib/approvals.ts';
import type { Catalog, Product, ShopConfig, ProductImage, FreeDownload, CheckoutInfo } from '../src/lib/types.ts';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const CONFIG_PATH = path.join(PROJECT_ROOT, 'shop.config.json');
const CATALOG_PATH = path.join(PROJECT_ROOT, 'src/data/catalog.json');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const PUBLIC_IMG_DIR = path.join(PUBLIC_DIR, 'images/products');
const PUBLIC_DOWNLOADS_DIR = path.join(PUBLIC_DIR, 'downloads/free');
const OVERRIDES_DIR = path.join(PROJECT_ROOT, 'data/overrides');
const PRICES_CSV = path.join(PROJECT_ROOT, 'data/prices.csv');
const APPROVALS_PATH = path.join(PROJECT_ROOT, 'data/checkout-approvals.json');
const CATEGORIES_PATH = path.join(PROJECT_ROOT, 'data/categories.json');
const CACHE_DIR = path.join(PROJECT_ROOT, 'data/cache');
const REPORTS_DIR = path.join(PROJECT_ROOT, 'reports');

async function main() {
  console.log('🚀 Starting Kinusaiga Store Importer & Sync...');

  // 1. Load config
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Config file not found at ${CONFIG_PATH}`);
  }
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as ShopConfig;

  // 2. Resolve source root
  let sourceRoot = (process.env.KINUSAIGA_SOURCE_ROOT || config.source.rootPath || '').trim();
  const localResourcesDir = path.join(PROJECT_ROOT, 'resources');
  if (!sourceRoot) {
    if (
      fs.existsSync(localResourcesDir) &&
      fs.readdirSync(localResourcesDir).some((f) => /^k\d+$/i.test(f))
    ) {
      sourceRoot = localResourcesDir;
    } else {
      const userDocs = process.env.USERPROFILE
        ? path.join(process.env.USERPROFILE, 'Documents')
        : path.join(process.env.HOME || '', 'Documents');
      sourceRoot = path.join(userDocs, config.source.defaultFolderName || 'A To Copy');
    }
  }

  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`Product source directory does not exist: "${sourceRoot}"`);
  }
  console.log(`📂 Source directory: ${sourceRoot}`);

  // Ensure directories
  fs.mkdirSync(PUBLIC_IMG_DIR, { recursive: true });
  fs.mkdirSync(PUBLIC_DOWNLOADS_DIR, { recursive: true });
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  // 3. Scan outer product folders
  const entries = fs.readdirSync(sourceRoot, { withFileTypes: true });
  const rawProductDirs = entries.filter((e) => e.isDirectory() && parseOuterFolderName(e.name) !== null);

  console.log(`🔍 Found ${rawProductDirs.length} potential product folders.`);

  const scannedIds = new Set<string>();
  const paidIds = new Set<string>();
  const freeIds = new Set<string>();

  for (const dir of rawProductDirs) {
    const parsed = parseOuterFolderName(dir.name)!;
    scannedIds.add(parsed.id);
    if (isFreeNumber(parsed.number, config.source.freeIdRange, parsed.id)) {
      freeIds.add(parsed.id);
    } else {
      paidIds.add(parsed.id);
    }
  }

  // 4. Load checkout mapping
  const cacheCheckoutFile = path.join(CACHE_DIR, 'checkout-mapping.csv');
  const mappingSource = await loadMappingSource({
    root: PROJECT_ROOT,
    csvUrl: process.env.CHECKOUT_SHEET_CSV_URL || config.checkoutSheet.csvUrl,
    spreadsheetId: config.checkoutSheet.spreadsheetId,
    range: config.checkoutSheet.range,
    apiKey: process.env.GOOGLE_SHEETS_API_KEY || '',
    localCsvPath: config.checkoutSheet.localCsvPath,
    cacheFile: cacheCheckoutFile,
  });

  for (const w of mappingSource.warnings) console.warn(`⚠️ [Checkout Source] ${w}`);

  let checkoutValidation = {
    map: new Map<string, { code: string; source: 'product-url' | 'checkout-url' | 'embed'; line: number }>(),
    critical: [] as string[],
    warnings: [] as string[],
  };

  if (mappingSource.text) {
    checkoutValidation = validateMapping(mappingSource.text, scannedIds, paidIds);
    if (!mappingSource.fromCache && checkoutValidation.critical.length === 0) {
      fs.writeFileSync(cacheCheckoutFile, mappingSource.text, 'utf8');
    }
  }

  // 5. Load prices, overrides, categories, approvals
  const { map: pricesMap, errors: priceErrors } = loadPrices(PRICES_CSV);
  for (const pe of priceErrors) console.warn(`⚠️ [Price] ${pe}`);

  const overrides = loadOverrides(OVERRIDES_DIR);
  const categoriesConfig = loadCategoriesConfig(CATEGORIES_PATH);
  const approvalsData = loadApprovals(APPROVALS_PATH);

  // Load existing catalog if available for incremental updates & preserve addedAt
  let existingCatalog: Catalog = { generatedAt: null, generatorVersion: GENERATOR_VERSION, products: [] };
  if (fs.existsSync(CATALOG_PATH)) {
    try {
      existingCatalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
    } catch {}
  }
  const existingMap = new Map<string, Product>();
  for (const p of existingCatalog.products) existingMap.set(p.id, p);

  // 6. Process products
  const products: Product[] = [];
  const reportErrors: string[] = [...checkoutValidation.critical];
  const reportWarnings: string[] = [...checkoutValidation.warnings];
  const missingDownloads: string[] = [];
  const missingImages: string[] = [];

  const sortedDirs = rawProductDirs.sort((a, b) => compareIds(a.name, b.name));

  for (const dir of sortedDirs) {
    const { id, number } = parseOuterFolderName(dir.name)!;
    const isFree = isFreeNumber(number, config.source.freeIdRange, id);
    const outerPath = path.join(sourceRoot, dir.name);
    const existing = existingMap.get(id);

    const subEntries = fs.readdirSync(outerPath, { withFileTypes: true });
    const subDirs = subEntries.filter((e) => e.isDirectory());
    const subFiles = subEntries.filter((e) => e.isFile());

    // Niche discovery
    const refDir = subDirs.find((d) => isReferenceFolderName(d.name));
    let niche = '';
    let nicheSource = '';
    if (refDir) {
      nicheSource = refDir.name;
      const res = extractNiche(refDir.name);
      if (res.niche) {
        niche = res.niche;
      }
      for (const p of res.problems) reportWarnings.push(`${id}: ${p}`);
    } else {
      reportWarnings.push(`${id}: No reference folder with "Kinusaiga" found. Using default ID name.`);
      niche = `Pattern ${id}`;
    }

    // Designated image folder:
    // For KC copies: matching KC id or fallback to image folder
    // For free (K1-K12): number first, e.g. "7K", or fallback "K 6", "K6"
    // For paid (K13+): K first, e.g. "K24", "k53"
    let imgDir = subDirs.find((d) => {
      const name = d.name.toLowerCase().replace(/\s+/g, '');
      if (id.startsWith('KC')) {
        return name === id.toLowerCase() || name.includes(id.toLowerCase()) || name.endsWith('k') || name.startsWith('k');
      }
      if (isFree) {
        return name === `${number}k` || name === `k${number}`;
      } else {
        return name === `k${number}`;
      }
    });

    // Fallback search if spacing or naming differed slightly
    if (!imgDir) {
      imgDir = subDirs.find((d) => {
        const name = d.name.toLowerCase().replace(/\s+/g, '');
        if (id.startsWith('KC')) return name === id.toLowerCase() || name.includes(id.toLowerCase());
        return name === `${number}k` || name === `k${number}`;
      });
    }

    const imageFiles: string[] = [];
    if (imgDir) {
      const allFiles = fs.readdirSync(path.join(outerPath, imgDir.name));
      const exts = new Set(config.source.imageExtensions.map((x) => x.toLowerCase()));
      for (const f of allFiles) {
        if (exts.has(path.extname(f).toLowerCase())) {
          imageFiles.push(f);
        }
      }
    } else {
      reportWarnings.push(`${id}: Designated preview folder (${isFree ? `${number}K` : `K${number}`}) not found.`);
      missingImages.push(id);
    }

    if (imgDir && imageFiles.length === 0) {
      reportWarnings.push(`${id}: No image files found in ${imgDir.name}.`);
      missingImages.push(id);
    }

    // Sort images numerically
    const { sorted: sortedImageNames, notes: imgNotes, primaryAmbiguous } = sortImageFiles(imageFiles);
    for (const note of imgNotes) reportWarnings.push(`${id}: ${note}`);

    // Free download PDF check
    let freeDownload: FreeDownload | null = null;
    if (isFree) {
      const pdfFile = subFiles.find((f) => f.name.toLowerCase().endsWith('.pdf') && f.name.toLowerCase().includes('pattern'));
      const fallbackPdf = subFiles.find((f) => f.name.toLowerCase().endsWith('.pdf'));
      const chosenPdf = pdfFile || fallbackPdf;

      if (chosenPdf) {
        const srcPdfPath = path.join(outerPath, chosenPdf.name);
        const destPdfName = `${id.toLowerCase()}-free-kinusaiga-pattern.pdf`;
        const destPdfPath = path.join(PUBLIC_DOWNLOADS_DIR, destPdfName);
        fs.copyFileSync(srcPdfPath, destPdfPath);

        const stat = fs.statSync(destPdfPath);
        // Inspect if it contains external links (Google Drive / Dropbox)
        let isLinkDoc = false;
        const linkHosts: string[] = [];
        try {
          const content = fs.readFileSync(destPdfPath, 'binary');
          const uriMatches = content.match(/\/URI\s*\(([^)]*)\)/g);
          if (uriMatches && uriMatches.length > 0) {
            isLinkDoc = true;
            for (const m of uriMatches) {
              const url = m.replace(/\/URI\s*\(/, '').replace(/\)$/, '');
              try {
                const u = new URL(url);
                if (!linkHosts.includes(u.hostname)) linkHosts.push(u.hostname);
              } catch {}
            }
          }
        } catch {}

        freeDownload = {
          url: `/downloads/free/${destPdfName}`,
          fileName: destPdfName,
          bytes: stat.size,
          kind: isLinkDoc ? 'link-document' : 'pdf',
          linkHosts,
        };
      } else {
        reportWarnings.push(`${id}: Free pattern is missing a pattern PDF file.`);
        missingDownloads.push(id);
      }
    }

    // Images optimization
    const productImgOutDir = path.join(PUBLIC_IMG_DIR, id.toLowerCase());
    fs.mkdirSync(productImgOutDir, { recursive: true });

    const processedImages: ProductImage[] = [];
    const baseSlug = productSlug(id, niche);

    for (let idx = 0; idx < sortedImageNames.length; idx++) {
      const imgName = sortedImageNames[idx];
      const srcImgPath = path.join(outerPath, imgDir!.name, imgName);
      const isPrimary = idx === 0;
      const baseName = isPrimary ? `${baseSlug}-main` : `${baseSlug}-gallery-${idx + 1}`;

      try {
        const proc = await processImage(
          srcImgPath,
          productImgOutDir,
          PUBLIC_DIR,
          baseName,
          config.images.widths,
          config.images.quality
        );

        let alt = `${niche} Kinusaiga pattern fabric art ${isPrimary ? 'finished preview' : `detail view ${idx + 1}`}.`;
        processedImages.push({
          index: idx + 1,
          sourceName: imgName,
          baseName,
          width: proc.width,
          height: proc.height,
          variants: proc.variants,
          alt,
          altSource: 'template',
          altNeedsReview: primaryAmbiguous && isPrimary,
        });
      } catch (err) {
        reportWarnings.push(`${id}: Failed to process image ${imgName} (${(err as Error).message})`);
      }
    }

    // Process OG Image from main preview
    let ogImageUrl: string | null = null;
    if (processedImages.length > 0 && imgDir && sortedImageNames[0]) {
      try {
        const mainSrc = path.join(outerPath, imgDir.name, sortedImageNames[0]);
        ogImageUrl = await processOgImage(
          mainSrc,
          productImgOutDir,
          PUBLIC_DIR,
          `${baseSlug}-main`,
          config.images.ogWidth
        );
      } catch {}
    }

    // Offering profile
    // Specific rule: K14 through K36 have 8 sizes (standard-8)
    let offeringKey: string | null = null;
    if (number >= 14 && number <= 36) {
      offeringKey = 'standard-8';
    } else if (isFree) {
      offeringKey = config.offering.freeProfile;
    } else {
      offeringKey = config.offering.paidProfile;
    }
    const offering = offeringKey ? config.offering.profiles[offeringKey] || null : null;

    // Build text context
    const textCtx = {
      id,
      niche,
      type: isFree ? ('free' as const) : ('paid' as const),
      offering,
      download: freeDownload,
      lifetimeAccess: config.payhip.lifetimeAccess,
    };

    const titles = generateTitles(textCtx);
    const metaDescription = generateMetaDescription(textCtx);
    const summary = generateSummary(textCtx);
    const keywords = generateKeywords(textCtx);
    const tags = generateTags(textCtx);
    const description = generateDescription(textCtx);
    const faq = generateFaq(textCtx);
    const catMatch = matchCategory(niche, categoriesConfig);

    // Checkout info
    let checkout: CheckoutInfo | null = null;
    const draftReasons: string[] = [];

    if (!isFree) {
      let mapping = checkoutValidation.map.get(id);
      if (!mapping) {
        const embedCandidates = ['embed.txt', 'embed.html', 'payhip.txt', 'checkout.txt'];
        for (const ec of embedCandidates) {
          const ecPath = path.join(outerPath, ec);
          if (fs.existsSync(ecPath)) {
            const parsed = parsePayhipLink(fs.readFileSync(ecPath, 'utf8'));
            if (parsed) {
              mapping = { code: parsed.code, source: parsed.source, line: 0 };
              break;
            }
          }
        }
      }

      if (!mapping) {
        draftReasons.push('Missing Payhip link in checkout sheet or product folder');
      } else {
        const urls = payhipUrls(mapping.code);
        const approvedCode = approvalsData.approvals[id];
        const isApproved = approvedCode === mapping.code;

        if (!isApproved) {
          draftReasons.push(`Payhip code "${mapping.code}" has not been approved (run: npm run approve-checkout)`);
        }

        checkout = {
          mode: config.payhip.buttonMode,
          code: mapping.code,
          productUrl: urls.productUrl,
          checkoutUrl: urls.checkoutUrl,
          approved: isApproved,
          onlineCheck: 'skipped',
        };
      }
    } else {
      if (!freeDownload) {
        draftReasons.push('Free product is missing downloadable PDF file');
      }
    }

    if (processedImages.length === 0) {
      draftReasons.push('No product preview images available');
    }

    // Price handling
    let price: number | null = null;
    let currency: string | null = null;
    if (isFree) {
      price = 0;
      currency = 'USD';
    } else {
      const pRec = pricesMap.get(id);
      if (pRec) {
        price = pRec.price;
        currency = pRec.currency;
      } else if (!id.startsWith('B')) {
        price = 1.99;
        currency = 'USD';
      } else {
        draftReasons.push('Price not set in data/prices.csv');
      }
    }

    // Determine status
    const status = draftReasons.length === 0 ? 'published' : 'draft';

    const pObj: Product = {
      id,
      number,
      type: isFree ? 'free' : 'paid',
      status,
      draftReasons,
      hidden: false,
      niche,
      nicheSourceFolder: nicheSource,
      slug: baseSlug,
      previousSlugs: existing?.slug && existing.slug !== baseSlug ? [...(existing.previousSlugs || []), existing.slug] : (existing?.previousSlugs || []),
      title: titles.title,
      seoTitle: titles.seoTitle,
      metaDescription,
      summary,
      description,
      faq,
      keywords,
      tags,
      category: catMatch.category,
      categorySlug: catMatch.categorySlug,
      price,
      currency,
      checkout,
      download: freeDownload,
      offeringProfile: offeringKey,
      formats: offering ? offering.formats : (isFree && freeDownload ? ['PDF'] : []),
      sizes: offering ? offering.sizes : [],
      noBackgroundVersion: offering ? offering.noBackgroundVersion : false,
      images: processedImages,
      ogImage: ogImageUrl,
      featured: config.catalog.featuredIds.includes(id),
      addedAt: existing?.addedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceMissing: false,
      generated: {
        version: GENERATOR_VERSION,
        inputsHash: inputsHash({ niche, sortedImageNames, isFree, offeringKey, price }),
      },
    };

    // Apply manual overrides if present
    const override = overrides.get(id);
    applyOverride(pObj, override);

    products.push(pObj);
  }

  // Only keep existing products that are currently present in the source directory
  // (Prune permanently removed copies / folders)

  // Sort catalog by ID number
  products.sort((a, b) => a.number - b.number);

  const catalog: Catalog = {
    generatedAt: new Date().toISOString(),
    generatorVersion: GENERATOR_VERSION,
    products,
  };

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), 'utf8');

  // Generate markdown report
  const reportPath = path.join(REPORTS_DIR, 'import-report.md');
  const publishedCount = products.filter((p) => p.status === 'published').length;
  const draftCount = products.filter((p) => p.status === 'draft').length;
  const freeCount = products.filter((p) => p.type === 'free').length;
  const paidCount = products.filter((p) => p.type === 'paid').length;

  const reportMd = `# Kinusaiga Catalog Import Report
Generated at: ${new Date().toISOString()}

## Summary
- **Total Products:** ${products.length}
- **Published:** ${publishedCount}
- **Drafts:** ${draftCount}
- **Free (K1–K12):** ${freeCount}
- **Paid (K13+):** ${paidCount}

## Critical Errors (${reportErrors.length})
${reportErrors.length === 0 ? '_None_' : reportErrors.map((e) => `- ❌ ${e}`).join('\n')}

## Warnings (${reportWarnings.length})
${reportWarnings.length === 0 ? '_None_' : reportWarnings.map((w) => `- ⚠️ ${w}`).join('\n')}

## Draft Products (${draftCount})
${
  draftCount === 0
    ? '_All products are published._'
    : products
        .filter((p) => p.status === 'draft')
        .map((p) => `- **${p.id}** (${p.niche}): ${p.draftReasons.join('; ')}`)
        .join('\n')
}
`;

  fs.writeFileSync(reportPath, reportMd, 'utf8');
  console.log(`\n✅ Catalog imported successfully!`);
  console.log(`📊 Total: ${products.length} | Published: ${publishedCount} | Drafts: ${draftCount}`);
  console.log(`📝 Report written to: reports/import-report.md\n`);
}

main().catch((err) => {
  console.error('❌ Importer failed:', err);
  process.exit(1);
});
