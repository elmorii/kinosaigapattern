import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const COPIES_ROOT = 'C:/Users/m/Documents/A To Copy/Copies';
const RESOURCES_ROOT = path.join(PROJECT_ROOT, 'resources');
const CATALOG_PATH = path.join(PROJECT_ROOT, 'src/data/catalog.json');

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function main() {
  console.log('🚀 Step 1: Linking 340 copy folders into resources directory...');
  if (!fs.existsSync(RESOURCES_ROOT)) {
    fs.mkdirSync(RESOURCES_ROOT, { recursive: true });
  }

  const copyFolders = fs.readdirSync(COPIES_ROOT).filter((f) => {
    return fs.statSync(path.join(COPIES_ROOT, f)).isDirectory() && /^K\d+_\d+$/i.test(f);
  });

  console.log(`Found ${copyFolders.length} copy folders in ${COPIES_ROOT}`);

  let linkedCount = 0;
  for (const folder of copyFolders) {
    const src = path.join(COPIES_ROOT, folder);
    const dest = path.join(RESOURCES_ROOT, folder);

    if (!fs.existsSync(dest)) {
      try {
        fs.symlinkSync(src, dest, 'junction');
        linkedCount++;
      } catch (err) {
        console.error(`Error linking ${folder}:`, err.message);
      }
    }
  }
  console.log(`✅ Stored/Linked ${linkedCount} copy folders into resources/ (${copyFolders.length} total available).`);

  console.log('📖 Step 2: Loading existing catalog.json...');
  const catalogRaw = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const originalProducts = catalogRaw.products.filter((p) => !p.id.includes('_'));
  console.log(`Loaded ${originalProducts.length} original parent products.`);

  const parentMap = new Map();
  for (const p of originalProducts) {
    parentMap.set(p.id.toUpperCase(), p);
  }

  // Sort copy folders by parent number then image number
  copyFolders.sort((a, b) => {
    const [pA, iA] = a.split('_').map((s) => parseInt(s.replace(/\D/g, ''), 10));
    const [pB, iB] = b.split('_').map((s) => parseInt(s.replace(/\D/g, ''), 10));
    if (pA !== pB) return pA - pB;
    return iA - iB;
  });

  // Group copy folders by parent to index their variation style (0, 1, 2, 3, 4)
  const copiesByParent = new Map();
  for (const copyId of copyFolders) {
    const parentId = copyId.split('_')[0].toUpperCase();
    if (!copiesByParent.has(parentId)) {
      copiesByParent.set(parentId, []);
    }
    copiesByParent.get(parentId).push(copyId);
  }

  console.log('✨ Step 3: Generating product entries for all 340 copies...');
  const newProducts = [];

  for (const [parentId, copies] of copiesByParent.entries()) {
    const parent = parentMap.get(parentId);
    if (!parent) {
      console.warn(`Parent product ${parentId} not found in catalog, skipping its copies.`);
      continue;
    }

    const niche = parent.niche;
    const nicheSlug = slugify(niche);
    const isFree = parent.type === 'free';

    copies.forEach((copyId, variantIndex) => {
      const parts = copyId.split('_');
      const targetImgNum = parseInt(parts[1], 10);
      const parentNum = parseInt(parentId.replace(/\D/g, ''), 10);
      const copyNumber = parentNum * 100 + targetImgNum;

      // Swapping images: targetImgNum becomes index 1 (primary), original 1 becomes targetImgNum position
      const clonedImages = JSON.parse(JSON.stringify(parent.images));
      const targetImgObj = clonedImages.find((img) => img.sourceName === `${targetImgNum}.png` || img.index === targetImgNum);
      const primaryImgObj = clonedImages.find((img) => img.sourceName === '1.png' || img.index === 1);

      let rearrangedImages = [];
      if (targetImgObj && primaryImgObj) {
        rearrangedImages = clonedImages.map((img) => {
          if (img === targetImgObj) {
            return {
              ...primaryImgObj,
              index: targetImgNum,
              alt: `${niche} Kinusaiga pattern fabric art detail view ${targetImgNum}.`,
            };
          }
          if (img === primaryImgObj) {
            return {
              ...targetImgObj,
              index: 1,
              alt: `${niche} Kinusaiga Pattern – printable Japanese fabric art template preview.`,
            };
          }
          return img;
        });
        // Sort so index 1 is first
        rearrangedImages.sort((a, b) => a.index - b.index);
      } else {
        rearrangedImages = clonedImages;
      }

      // Title & SEO variations as requested:
      // Variant 0: kinusaiga + niche + pattern
      // Variant 1: niche + kinusaiga patterns
      // Variant 2: kinusaiga patterns focus
      // Variant 3: keyword kinusaiga patterns
      // Variant 4: niche + kinusaiga pattern template
      let title = '';
      let seoTitle = '';
      let slug = '';
      let metaDescription = '';
      let summary = '';
      let keywords = [];

      const vMod = variantIndex % 5;
      const lowerCopyId = copyId.toLowerCase();

      if (isFree) {
        // Free pattern copy rules
        if (vMod === 0) {
          title = `Free Kinusaiga ${niche} Pattern – Printable Fabric Art Template`;
          seoTitle = `Free Kinusaiga ${niche} Pattern PDF – Printable Template`;
          slug = `free-kinusaiga-${nicheSlug}-pattern-${lowerCopyId}`;
          metaDescription = `Download this free Kinusaiga ${niche.toLowerCase()} pattern for no-sew Japanese fabric art. Instant printable PDF & PNG download with 10 size options.`;
          summary = `A 100% free Kinusaiga ${niche.toLowerCase()} pattern template for beginner and expert crafters. Instant digital download in PDF and PNG.`;
          keywords = [
            'free kinusaiga pattern',
            'kinusaiga pattern free',
            `free kinusaiga ${niche.toLowerCase()} pattern`,
            `kinusaiga ${niche.toLowerCase()} pattern free`,
            'free printable kinusaiga patterns',
            'free japanese fabric art template'
          ];
        } else if (vMod === 1) {
          title = `Free ${niche} Kinusaiga Patterns – Printable Template PDF`;
          seoTitle = `Kinusaiga Pattern Free – ${niche} Printable PDF Template`;
          slug = `free-${nicheSlug}-kinusaiga-patterns-${lowerCopyId}`;
          metaDescription = `Free printable ${niche.toLowerCase()} Kinusaiga patterns for no-sew fabric craft. Download the free PDF template instantly with zero cost.`;
          summary = `Explore free ${niche.toLowerCase()} Kinusaiga patterns. Printable digital template pack with full sizing instructions. Completely free.`;
          keywords = [
            'kinusaiga pattern free',
            'free kinusaiga pattern',
            `free ${niche.toLowerCase()} kinusaiga patterns`,
            `${niche.toLowerCase()} kinusaiga patterns free`,
            'free kinusaiga patterns download',
            'no sew fabric craft free'
          ];
        } else if (vMod === 2) {
          title = `Free Kinusaiga Pattern: ${niche} Fabric Art Design`;
          seoTitle = `Free Kinusaiga Pattern – ${niche} Printable Fabric Art`;
          slug = `free-kinusaiga-pattern-${nicheSlug}-${lowerCopyId}`;
          metaDescription = `Get this free Kinusaiga pattern featuring a charming ${niche.toLowerCase()} design. High-resolution PDF template ready to print at home.`;
          summary = `Delightful free Kinusaiga pattern designed for beginners. Download your instant PDF files and create beautiful ${niche.toLowerCase()} wall decor.`;
          keywords = [
            'free kinusaiga pattern',
            'kinusaiga patterns free',
            `free kinusaiga pattern ${niche.toLowerCase()}`,
            'printable kinusaiga pattern free',
            'free foam board fabric tucking template'
          ];
        } else if (vMod === 3) {
          title = `Kinusaiga Pattern Free – ${niche} Printable Fabric Art`;
          seoTitle = `Kinusaiga Patterns Free: ${niche} Template PDF Download`;
          slug = `kinusaiga-pattern-free-${nicheSlug}-${lowerCopyId}`;
          metaDescription = `Looking for a kinusaiga pattern free download? Grab this complete ${niche.toLowerCase()} pattern pack in PDF and PNG formats. Free forever.`;
          summary = `Kinusaiga pattern free digital template. Includes multiple standard craft dimensions for tucking fabric scraps into foam board.`;
          keywords = [
            'kinusaiga pattern free',
            'free kinusaiga patterns',
            'free kinusaiga pattern',
            `kinusaiga pattern free ${niche.toLowerCase()}`,
            'free kinusaiga patterns pdf'
          ];
        } else {
          title = `Free Printable Kinusaiga Pattern – ${niche} Design`;
          seoTitle = `Free Printable Kinusaiga Pattern – ${niche} PDF & PNG`;
          slug = `free-printable-kinusaiga-pattern-${nicheSlug}-${lowerCopyId}`;
          metaDescription = `Free printable Kinusaiga pattern for ${niche.toLowerCase()} textile art. Direct PDF download in 10 size options. No checkout required.`;
          summary = `Start your no-sew Japanese fabric art journey with this free printable ${niche.toLowerCase()} Kinusaiga pattern template.`;
          keywords = [
            'free printable kinusaiga pattern',
            'free kinusaiga pattern',
            'kinusaiga pattern free',
            `free printable ${niche.toLowerCase()} kinusaiga`,
            'free japanese craft template'
          ];
        }
      } else {
        // Paid pattern copy rules
        if (vMod === 0) {
          // kinusaiga + niche + pattern
          title = `Kinusaiga ${niche} Pattern – Printable Fabric Art Template`;
          seoTitle = `Kinusaiga ${niche} Pattern (PDF & PNG) – Fabric Art Template`;
          slug = `kinusaiga-${nicheSlug}-pattern-${lowerCopyId}`;
          metaDescription = `Printable Kinusaiga ${niche.toLowerCase()} pattern for no-sew Japanese fabric art. Instant digital download in PDF and PNG with 10 size options.`;
          summary = `A printable Kinusaiga ${niche.toLowerCase()} pattern template for tucking fabric scraps into foam board. High-resolution PDF & PNG files.`;
          keywords = [
            `kinusaiga ${niche.toLowerCase()} pattern`,
            `kinusaiga ${niche.toLowerCase()} template`,
            'kinusaiga pattern',
            'japanese fabric art',
            'printable kinusaiga pattern'
          ];
        } else if (vMod === 1) {
          // niche + kinusaiga patterns
          title = `${niche} Kinusaiga Patterns – Printable Fabric Art Template`;
          seoTitle = `${niche} Kinusaiga Patterns (PDF & PNG) – DIY Craft Template`;
          slug = `${nicheSlug}-kinusaiga-patterns-${lowerCopyId}`;
          metaDescription = `Explore authentic ${niche.toLowerCase()} Kinusaiga patterns for no-sew fabric crafting. Instant PDF download in 10 sizes with full printing guide.`;
          summary = `Detailed ${niche.toLowerCase()} Kinusaiga patterns for creating stunning Japanese textile wall art at home. Instant digital delivery.`;
          keywords = [
            `${niche.toLowerCase()} kinusaiga patterns`,
            `printable ${niche.toLowerCase()} kinusaiga`,
            'kinusaiga patterns',
            'no sew fabric art patterns',
            'diy kinusaiga'
          ];
        } else if (vMod === 2) {
          // kinusaiga patterns focus
          title = `Kinusaiga Patterns: ${niche} Design – Printable Craft Template`;
          seoTitle = `Kinusaiga Patterns – ${niche} Printable Fabric Art Template`;
          slug = `kinusaiga-patterns-${nicheSlug}-${lowerCopyId}`;
          metaDescription = `High quality Kinusaiga patterns featuring a beautiful ${niche.toLowerCase()} design. Download printable vector-crisp PDF and PNG templates today.`;
          summary = `Kinusaiga patterns crafted for textile lovers. Features a charming ${niche.toLowerCase()} motif formatted for foam board tucking in 10 sizes.`;
          keywords = [
            'kinusaiga patterns',
            `kinusaiga patterns ${niche.toLowerCase()}`,
            'kinusaiga pattern template',
            'fabric art patterns',
            'printable templates'
          ];
        } else if (vMod === 3) {
          // keyword kinusaiga patterns
          title = `Printable Kinusaiga Patterns – ${niche} Fabric Art Template`;
          seoTitle = `Printable Kinusaiga Patterns – ${niche} Japanese Art Design`;
          slug = `printable-kinusaiga-patterns-${nicheSlug}-${lowerCopyId}`;
          metaDescription = `Discover printable Kinusaiga patterns with clean grooving lines and 10 size options. Download your ${niche.toLowerCase()} template package instantly.`;
          summary = `Printable Kinusaiga patterns for Japanese foam board tucking. Features ${niche.toLowerCase()} artwork in square, rectangular, and circle ratios.`;
          keywords = [
            'printable kinusaiga patterns',
            'kinusaiga patterns',
            'kinusaiga patterns download',
            `printable ${niche.toLowerCase()} fabric pattern`,
            'japanese kinusaiga craft'
          ];
        } else {
          // niche + kinusaiga pattern template
          title = `${niche} Kinusaiga Pattern Template – Printable Fabric Craft`;
          seoTitle = `${niche} Kinusaiga Pattern Template (PDF & PNG)`;
          slug = `${nicheSlug}-kinusaiga-template-${lowerCopyId}`;
          metaDescription = `Complete ${niche.toLowerCase()} Kinusaiga pattern template with 10 size variations, PDF and PNG files, and clean lines for easy tucking.`;
          summary = `Create handmade Japanese fabric wall art with this ${niche.toLowerCase()} Kinusaiga pattern template. Instant download after payment.`;
          keywords = [
            `${niche.toLowerCase()} kinusaiga pattern template`,
            'kinusaiga template',
            'kinusaiga pattern',
            'kinusaiga patterns',
            'foam board craft pattern'
          ];
        }
      }

      // Add common base keywords
      const commonKeywords = [
        'kinusaiga pattern',
        'kinusaiga patterns',
        'japanese fabric art',
        'printable pattern template'
      ];
      keywords = Array.from(new Set([...keywords, ...commonKeywords]));

      // Build product object preserving all parent offering, sizes, formats, etc.
      const newProduct = {
        ...parent,
        id: copyId,
        number: copyNumber,
        type: parent.type,
        status: 'published',
        draftReasons: [],
        hidden: false,
        niche: parent.niche,
        nicheSourceFolder: parent.nicheSourceFolder || `kinusaiga ${niche.toLowerCase()} pattern - ${copyId}`,
        slug: slug,
        previousSlugs: [],
        title: title,
        seoTitle: seoTitle,
        metaDescription: metaDescription,
        summary: summary,
        description: {
          ...parent.description,
          features: isFree
            ? [
                `100% Free ${niche} Kinusaiga pattern`,
                '10 different size options included',
                'No-background version included',
                'Instant digital PDF & PNG download',
                'Print at home or your local print shop',
                'No physical product will be shipped'
              ]
            : [
                `High-quality ${niche} Kinusaiga pattern design`,
                '10 different size options included',
                'No-background version included',
                `${niche} Kinusaiga PDF and PNG formats`,
                'Suitable for printing at home or at a print shop',
                'Instant digital download after successful payment',
                'No physical product will be shipped'
              ],
        },
        faq: parent.faq,
        keywords: keywords,
        tags: [
          'kinusaiga pattern',
          'printable',
          niche.toLowerCase(),
          'kinusaiga patterns',
          'digital download',
          isFree ? 'free pattern' : 'fabric art',
          'pdf',
          'png'
        ],
        category: parent.category,
        categorySlug: parent.categorySlug,
        price: parent.price,
        currency: parent.currency || 'USD',
        // Crucial: Exact same Payhip embed link as parent!
        checkout: {
          ...parent.checkout
        },
        offeringProfile: parent.offeringProfile,
        formats: parent.formats || ['PDF', 'PNG'],
        sizes: parent.sizes || [],
        noBackgroundVersion: parent.noBackgroundVersion ?? true,
        download: parent.download,
        images: rearrangedImages,
        ogImage: rearrangedImages[0]?.variants?.find((v) => v.width >= 800)?.src || rearrangedImages[0]?.variants?.[0]?.src || parent.ogImage,
        featured: false,
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sourceMissing: false,
        generated: {
          version: 1,
          parent: parent.id,
          swappedImage: targetImgNum
        }
      };

      newProducts.push(newProduct);
    });
  }

  console.log(`Generated ${newProducts.length} new product copies!`);

  // Merge originals + new copies
  // Sort catalog by number
  const fullCatalog = [...originalProducts, ...newProducts];
  fullCatalog.sort((a, b) => a.number - b.number);

  const updatedCatalogData = {
    generatedAt: new Date().toISOString(),
    generatorVersion: 1,
    products: fullCatalog
  };

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(updatedCatalogData, null, 2), 'utf8');
  console.log(`🎉 Successfully saved ${fullCatalog.length} products to ${CATALOG_PATH}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
