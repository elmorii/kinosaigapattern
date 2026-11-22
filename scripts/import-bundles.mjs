import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const PROJECT_ROOT = path.resolve('C:/Users/m/Documents/First Digital Shop');
const SOURCE_ROOT = path.resolve('C:/Users/m/Documents/A To Copy');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const CATALOG_PATH = path.join(PROJECT_ROOT, 'src/data/catalog.json');

const COMMON_BUNDLE_KEYWORDS = [
  "kinusaiga bundle",
  "kinusaiga patterns",
  "kinusaiga patterns bundle",
  "kinusaiga templates",
  "kinusaiga patterns download",
  "kinusaiga template bundle",
  "printable kinusaiga patterns",
  "kinusaiga patterns printable",
  "kinusaiga patterns pdf"
];

const BUNDLE_DEFS = [
  {
    id: 'K113',
    number: 113,
    subfolder: '100 Designs Kinusaiga Bundle',
    niche: '100 Designs Bundle',
    title: '100 Designs Kinusaiga Bundle – Complete Fabric Art Pattern Collection',
    seoTitle: '100 Designs Kinusaiga Bundle (PDF & PNG) – Fabric Art Templates',
    metaDescription: 'Get the 100 Designs Kinusaiga bundle for no-sew Japanese fabric art. Complete digital PDF and PNG templates collection with multiple frame size options.',
    summary: 'An extensive collection of 100 printable Kinusaiga pattern designs for handmade fabric art. Instant digital PDF and PNG download.',
    category: 'Art Patterns',
    categorySlug: 'art-patterns',
    price: 50,
    payhipCode: '70z3l',
    slug: '100-designs-kinusaiga-bundle-k113',
    keywords: [
      '100 designs kinusaiga bundle',
      'kinusaiga bundle',
      'kinusaiga patterns bundle',
      'japanese fabric art bundle',
      'printable kinusaiga patterns',
      'no sew fabric art templates',
      'kinusaiga pattern pdf',
      'kinusaiga pattern collection'
    ],
    tags: [
      'kinusaiga bundle',
      'bundle',
      '100 designs',
      'japanese fabric art',
      'printable patterns',
      'pdf',
      'png'
    ]
  },
  {
    id: 'K114',
    number: 114,
    subfolder: '40 Animal Kinusaiga Bundle',
    niche: '40 Animal Bundle',
    title: '40 Animal Kinusaiga Bundle – Printable Fabric Art Templates',
    seoTitle: '40 Animal Kinusaiga Bundle (PDF & PNG) – Fabric Art Templates',
    metaDescription: 'Complete 40 Animal Kinusaiga pattern bundle for no-sew Japanese fabric art. Printable PDF and PNG templates featuring animals in multiple sizes.',
    summary: 'A curated collection of 40 animal Kinusaiga patterns for no-sew Japanese fabric art. Instant digital download with PDF and PNG templates.',
    category: 'Animal Patterns',
    categorySlug: 'animal-patterns',
    price: 20,
    payhipCode: '0L4k6',
    slug: '40-animal-kinusaiga-bundle-k114',
    keywords: [
      '40 animal kinusaiga bundle',
      'animal kinusaiga bundle',
      'animal fabric art patterns',
      'kinusaiga animal patterns',
      'printable animal patterns',
      'japanese textile art animals',
      'kinusaiga pattern pdf'
    ],
    tags: [
      'kinusaiga bundle',
      'animal patterns',
      '40 animals',
      'japanese fabric art',
      'printable patterns',
      'pdf',
      'png'
    ]
  },
  {
    id: 'K115',
    number: 115,
    subfolder: '28 Nature Kinusaiga Bundle',
    niche: '28 Nature Bundle',
    title: '28 Nature Kinusaiga Bundle – Printable Fabric Art Templates',
    seoTitle: '28 Nature Kinusaiga Bundle (PDF & PNG) – Fabric Art Templates',
    metaDescription: 'Explore 28 Nature Kinusaiga patterns for no-sew fabric art. High quality printable PDF and PNG designs including flowers, landscapes, and plants.',
    summary: 'A collection of 28 nature-inspired Kinusaiga patterns for no-sew Japanese fabric art. Instant digital download in PDF and PNG formats.',
    category: 'Nature Patterns',
    categorySlug: 'nature-patterns',
    price: 14,
    payhipCode: '0umGS',
    slug: '28-nature-kinusaiga-bundle-k115',
    keywords: [
      '28 nature kinusaiga bundle',
      'nature kinusaiga patterns',
      'landscape kinusaiga patterns',
      'botanical fabric art patterns',
      'flower kinusaiga templates',
      'japanese fabric art nature'
    ],
    tags: [
      'kinusaiga bundle',
      'nature patterns',
      '28 nature designs',
      'japanese fabric art',
      'printable patterns',
      'pdf',
      'png'
    ]
  },
  {
    id: 'K116',
    number: 116,
    subfolder: '6 Vegetable Kinusaiga Bundle',
    niche: '6 Vegetable Bundle',
    title: '6 Vegetable Kinusaiga Bundle – Printable Fabric Art Templates',
    seoTitle: '6 Vegetable Kinusaiga Bundle (PDF & PNG) – Fabric Art Templates',
    metaDescription: 'Download the 6 Vegetable Kinusaiga bundle for no-sew Japanese fabric art. Complete digital PDF and PNG pattern templates in multiple frame sizes.',
    summary: 'A delightful set of 6 vegetable Kinusaiga pattern templates for no-sew fabric crafting. Instant digital download in PDF and PNG formats.',
    category: 'Vegetable Patterns',
    categorySlug: 'vegetable-patterns',
    price: 3,
    payhipCode: '1PCB9',
    slug: '6-vegetable-kinusaiga-bundle-k116',
    keywords: [
      '6 vegetable kinusaiga bundle',
      'vegetable kinusaiga patterns',
      'kitchen fabric art patterns',
      'printable vegetable templates',
      'japanese fabric art vegetables'
    ],
    tags: [
      'kinusaiga bundle',
      'vegetable patterns',
      '6 vegetables',
      'japanese fabric art',
      'printable patterns',
      'pdf',
      'png'
    ]
  },
  {
    id: 'K117',
    number: 117,
    subfolder: '8 Fruit Kinusaiga Bundle',
    niche: '8 Fruit Bundle',
    title: '8 Fruit Kinusaiga Bundle – Printable Fabric Art Templates',
    seoTitle: '8 Fruit Kinusaiga Bundle (PDF & PNG) – Fabric Art Templates',
    metaDescription: 'Get the 8 Fruit Kinusaiga bundle for no-sew fabric crafting. Printable digital templates in PDF and PNG formats with multiple frame size options.',
    summary: 'A vibrant collection of 8 fruit Kinusaiga pattern templates for handmade fabric art. Instant digital PDF and PNG download.',
    category: 'Fruit Patterns',
    categorySlug: 'fruit-patterns',
    price: 4,
    payhipCode: 'hpy3U',
    slug: '8-fruit-kinusaiga-bundle-k117',
    keywords: [
      '8 fruit kinusaiga bundle',
      'fruit kinusaiga patterns',
      'fruit fabric art templates',
      'printable fruit patterns',
      'japanese fabric art fruit'
    ],
    tags: [
      'kinusaiga bundle',
      'fruit patterns',
      '8 fruit designs',
      'japanese fabric art',
      'printable patterns',
      'pdf',
      'png'
    ]
  },
  {
    id: 'K118',
    number: 118,
    subfolder: '11 Insect Kinusaiga Bundle',
    niche: '11 Insect Bundle',
    title: '11 Insect Kinusaiga Bundle – Printable Fabric Art Templates',
    seoTitle: '11 Insect Kinusaiga Bundle (PDF & PNG) – Fabric Art Templates',
    metaDescription: 'Discover 11 Insect Kinusaiga patterns for no-sew fabric art. High quality printable PDF and PNG designs including butterflies, beetles, and bees.',
    summary: 'A unique bundle of 11 insect Kinusaiga patterns for Japanese fabric crafting. Instant digital download in PDF and PNG formats.',
    category: 'Insect Pattern',
    categorySlug: 'insect-pattern',
    price: 5,
    payhipCode: 'FCT5r',
    slug: '11-insect-kinusaiga-bundle-k118',
    keywords: [
      '11 insect kinusaiga bundle',
      'insect kinusaiga patterns',
      'butterfly kinusaiga pattern',
      'beetle fabric art pattern',
      'printable insect templates'
    ],
    tags: [
      'kinusaiga bundle',
      'insect patterns',
      '11 insects',
      'japanese fabric art',
      'printable patterns',
      'pdf',
      'png'
    ]
  },
  {
    id: 'K119',
    number: 119,
    subfolder: '16 Ordinary Kinusaiga Bundle',
    niche: '16 Ordinary Objects Bundle',
    title: '16 Ordinary Objects Kinusaiga Bundle – Printable Fabric Art Templates',
    seoTitle: '16 Ordinary Objects Kinusaiga Bundle (PDF & PNG) – Fabric Art Templates',
    metaDescription: 'Complete 16 Ordinary Objects Kinusaiga pattern bundle for no-sew fabric art. Printable PDF and PNG templates for cups, books, and everyday items.',
    summary: 'A charming bundle of 16 ordinary object Kinusaiga pattern templates for no-sew fabric crafting. Instant digital download in PDF and PNG.',
    category: 'Ordinary Object Patterns',
    categorySlug: 'ordinary-object-patterns',
    price: 8,
    payhipCode: 'kdn4H',
    slug: '16-ordinary-kinusaiga-bundle-k119',
    keywords: [
      '16 ordinary objects kinusaiga bundle',
      'ordinary object kinusaiga patterns',
      'everyday objects fabric art',
      'printable kinusaiga templates',
      'japanese fabric art objects'
    ],
    tags: [
      'kinusaiga bundle',
      'ordinary objects',
      '16 designs',
      'japanese fabric art',
      'printable patterns',
      'pdf',
      'png'
    ]
  }
];

const STANDARD_SIZES = [
  { label: '5 × 5 in', cm: '12.7 × 12.7 cm', ratio: '1:1', shape: 'square' },
  { label: 'Circle design border shape', ratio: '1:1', shape: 'circle' },
  { label: '7 × 5 in', cm: '17.78 × 12.7 cm', ratio: '7:5', shape: 'rectangle' },
  { label: '5 × 7 in', cm: '12.7 × 17.78 cm', ratio: '5:7', shape: 'rectangle' },
  { label: '6 × 6 in', cm: '15.24 × 15.24 cm', ratio: '1:1', shape: 'square' },
  { label: '7 × 7 in', cm: '17.78 × 17.78 cm', ratio: '1:1', shape: 'square' },
  { label: '8 × 8 in', cm: '20.32 × 20.32 cm', ratio: '1:1', shape: 'square' },
  { label: '10 × 10 in', cm: '25.4 × 25.4 cm', ratio: '1:1', shape: 'square' },
  { label: '8 × 10 in', cm: '20.32 × 25.4 cm', ratio: '4:5', shape: 'rectangle' },
  { label: '10 × 8 in', cm: '25.4 × 20.32 cm', ratio: '5:4', shape: 'rectangle' }
];

async function processBundle(def) {
  console.log(`Processing ${def.id} - ${def.title}...`);
  const outDir = path.join(PUBLIC_DIR, 'images', 'products', def.id.toLowerCase());
  fs.mkdirSync(outDir, { recursive: true });

  const srcDir = path.join(SOURCE_ROOT, def.id, def.subfolder);
  const images = [];

  for (let idx = 1; idx <= 6; idx++) {
    const srcImgName = `${idx}.png`;
    const srcImgPath = path.join(srcDir, srcImgName);
    if (!fs.existsSync(srcImgPath)) {
      console.warn(`Warning: ${srcImgPath} does not exist`);
      continue;
    }

    const isPrimary = idx === 1;
    const baseName = isPrimary ? `${def.slug}-main` : `${def.slug}-gallery-${idx}`;

    const input = await fs.promises.readFile(srcImgPath);
    const base = sharp(input, { failOn: 'none' }).rotate();
    const meta = await base.metadata();
    const ow = meta.width || 2000;
    const oh = meta.height || 2000;

    const widths = [400, 800, 1400];
    const variants = [];

    for (const w of widths) {
      const fileName = `${baseName}-${w}.webp`;
      const targetFile = path.join(outDir, fileName);
      await base
        .clone()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toFile(targetFile);

      variants.push({
        width: w,
        src: `/images/products/${def.id.toLowerCase()}/${fileName}`
      });
    }

    const alt = isPrimary
      ? `${def.niche} Kinusaiga pattern fabric art finished preview.`
      : `${def.niche} Kinusaiga pattern fabric art detail view ${idx}.`;

    images.push({
      index: idx,
      sourceName: srcImgName,
      baseName,
      width: 1400,
      height: 1400,
      variants,
      alt,
      altSource: 'template',
      altNeedsReview: false
    });
  }

  // Create OG image using image 1
  const ogSrcImgPath = path.join(srcDir, '1.png');
  const ogFileName = `${def.slug}-main-og.jpg`;
  const ogTargetFile = path.join(outDir, ogFileName);
  await sharp(ogSrcImgPath, { failOn: 'none' })
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(ogTargetFile);

  const ogImage = `/images/products/${def.id.toLowerCase()}/${ogFileName}`;

  const product = {
    id: def.id,
    number: def.number,
    type: 'paid',
    status: 'published',
    draftReasons: [],
    hidden: false,
    isBundle: true,
    niche: def.niche,
    nicheSourceFolder: def.subfolder,
    slug: def.slug,
    previousSlugs: [],
    title: def.title,
    seoTitle: def.seoTitle,
    metaDescription: def.metaDescription,
    summary: def.summary,
    description: {
      overview: [
        `Create beautiful handmade Japanese fabric art with this ${def.title}. Kinusaiga is the relaxing, no-sew Japanese fabric craft where fabric pieces are tucked into precision grooves on a board to create vibrant textile pictures.`,
        `This value bundle contains a comprehensive collection of printable Kinusaiga patterns in high-resolution PDF and PNG formats, ready for instant printing at home or at your local print shop.`
      ],
      included: [
        `Access to all pattern files in the ${def.title} collection.`,
        `Multiple frame size variations for each design (including square, rectangle, and circle border shapes).`,
        `High-resolution printable PDF and PNG formats.`,
        `Numbered pattern guide and cutting lines for effortless fabric tucking.`
      ],
      features: [
        `Complete ${def.title} pattern collection`,
        `Print-ready high-resolution PDF and PNG files`,
        `Multiple frame sizes and ratios included`,
        `100% no-sew Japanese Kinusaiga technique`,
        `Instant digital download delivery after purchase`,
        `No physical materials shipped - start crafting immediately`
      ],
      access: [
        `Click "Buy Now" to open the secure checkout.`,
        `Complete your payment using your preferred payment method.`,
        `After payment confirmation, your download link is provided immediately and emailed to your address.`,
        `For the best printing results, download and open your files on a desktop or laptop computer.`
      ],
      important: [
        `This listing is for digital printable Kinusaiga patterns only. No physical product, foam board, fabric, or tools will be shipped.`,
        `Print the pattern templates at 100% ("actual size") to maintain accurate dimensions for your fabric art board.`
      ],
      questionsIntro: `Have a question before or after your purchase? Contact us – we are happy to help with:`,
      questions: [
        `Downloading and accessing your digital files`,
        `Technical guidance for opening and printing templates`,
        `Understanding included file formats and sizing options`
      ],
      closing: `Explore our full shop for more printable Kinusaiga patterns, individual designs, and free starter templates.`
    },
    faq: [
      {
        q: 'Is this a physical product?',
        a: 'No. This is a digital Kinusaiga pattern bundle. Nothing is physically shipped – you download and print the patterns yourself. Fabric, foam board, and tools are not included.'
      },
      {
        q: 'How do I receive my files?',
        a: 'Checkout is handled securely via Payhip. After successful payment, your download link appears on screen and is also emailed to your address.'
      },
      {
        q: 'Which payment methods can I use?',
        a: 'Available payment methods are shown on the secure Payhip checkout page before you complete your purchase.'
      },
      {
        q: 'What size should I print?',
        a: 'Select your preferred size from the included options and print at 100% scale ("actual size") so the pattern maintains its exact proportions.'
      }
    ],
    keywords: Array.from(new Set([...(def.keywords || []), ...COMMON_BUNDLE_KEYWORDS])),
    tags: Array.from(new Set([...(def.tags || []), 'kinusaiga bundle', 'bundle', 'kinusaiga templates', 'kinusaiga patterns bundle'])),
    category: def.category,
    categorySlug: def.categorySlug,
    price: def.price ?? 1.99,
    currency: 'USD',
    checkout: def.payhipCode ? {
      mode: 'embed',
      code: def.payhipCode,
      productUrl: `https://payhip.com/b/${def.payhipCode}`,
      checkoutUrl: `https://payhip.com/b/${def.payhipCode}`,
      approved: true,
      onlineCheck: 'passed',
    } : null,
    download: null,
    offeringProfile: 'standard-10',
    formats: ['PDF', 'PNG'],
    sizes: STANDARD_SIZES,
    noBackgroundVersion: true,
    images,
    ogImage,
    featured: false,
    addedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceMissing: false,
    generated: {
      version: 1,
      inputsHash: `bundle_${def.id.toLowerCase()}`
    }
  };

  return product;
}

async function run() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

  for (const def of BUNDLE_DEFS) {
    const prod = await processBundle(def);
    const existingIndex = catalog.products.findIndex((p) => p.id === def.id);
    if (existingIndex >= 0) {
      if (catalog.products[existingIndex].checkout && !prod.checkout) {
        prod.checkout = catalog.products[existingIndex].checkout;
      }
      catalog.products[existingIndex] = prod;
      console.log(`Updated existing product ${def.id}`);
    } else {
      catalog.products.push(prod);
      console.log(`Added new product ${def.id}`);
    }
  }

  // Sort products: originals by number, copies appropriately
  catalog.products.sort((a, b) => a.number - b.number);

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`Catalog successfully saved with ${catalog.products.length} products!`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
