/**
 * Shared types used by BOTH the build-time importer (scripts/) and the Astro website (src/).
 * The importer writes src/data/catalog.json using these shapes; the website only reads it.
 */

export type ProductType = 'free' | 'paid';
export type ProductStatus = 'published' | 'draft';

export interface ImageVariant {
  width: number;
  src: string; // public URL, e.g. /images/products/k24/k24-hummingbird-kinusaiga-pattern-main-800.webp
}

export interface ProductImage {
  index: number; // 1-based display order (1 = primary image)
  sourceName: string; // original file name inside the designated image folder (informational only)
  baseName: string; // SEO file name without width suffix / extension
  width: number; // intrinsic width of the largest variant
  height: number; // intrinsic height of the largest variant
  variants: ImageVariant[];
  alt: string;
  altSource: 'template' | 'vision' | 'override';
  altNeedsReview: boolean;
  caption?: string;
}

export interface SizeOption {
  label: string;
  cm?: string;
  ratio: string;
  shape: 'square' | 'rectangle' | 'circle';
}

export interface OfferingProfile {
  label: string;
  formats: string[];
  noBackgroundVersion: boolean;
  sizes: SizeOption[];
}

export interface ProductDescription {
  overview: string[];
  included: string[];
  features: string[];
  access: string[];
  important: string[];
  questionsIntro: string;
  questions: string[];
  closing: string;
}

export interface ProductFaq {
  q: string;
  a: string;
}

export interface CheckoutInfo {
  mode: 'embed' | 'link';
  code: string; // Payhip product code, e.g. "AbC1"
  productUrl: string; // https://payhip.com/b/CODE
  checkoutUrl: string; // https://payhip.com/buy?link=CODE
  approved: boolean;
  onlineCheck: 'match' | 'mismatch' | 'unavailable' | 'skipped';
  onlineTitle?: string;
}

export interface FreeDownload {
  url: string; // public URL of the free PDF
  fileName: string;
  bytes: number;
  kind: 'pdf' | 'link-document'; // link-document = PDF that contains a link to the pattern files
  linkHosts: string[];
}

export interface Product {
  id: string; // permanent primary key, e.g. "K24"
  number: number;
  type: ProductType;
  status: ProductStatus;
  draftReasons: string[];
  hidden: boolean;
  isBundle?: boolean;

  niche: string; // e.g. "Hummingbird", "Sea Turtle"
  nicheSourceFolder: string; // name of the reference folder the niche was read from
  slug: string;
  previousSlugs: string[];

  title: string; // H1
  seoTitle: string;
  metaDescription: string;
  summary: string;
  description: ProductDescription;
  faq: ProductFaq[];
  keywords: string[];
  tags: string[];
  category: string;
  categorySlug: string;

  price: number | null; // 0 for free products
  currency: string | null;
  checkout: CheckoutInfo | null;
  download: FreeDownload | null;

  offeringProfile: string | null;
  formats: string[]; // verified formats only
  sizes: SizeOption[]; // verified sizes only
  noBackgroundVersion: boolean;

  images: ProductImage[];
  ogImage: string | null;

  featured: boolean;
  addedAt: string; // ISO date the product was first seen (folder creation time when available)
  updatedAt: string;
  sourceMissing: boolean;

  generated: {
    version: number;
    inputsHash: string;
  };
}

export interface Catalog {
  generatedAt: string | null;
  generatorVersion: number;
  products: Product[];
}

export interface ShopConfig {
  shop: {
    name: string;
    shortName: string;
    tagline: string;
    siteUrl: string;
    locale: string;
    contactEmail: string;
    contactFormEndpoint: string;
    ownerName: string;
    businessLocation: string;
    supportResponseTime: string;
    social: Record<string, string>;
  };
  source: {
    rootPath: string;
    defaultFolderName: string;
    freeIdRange: [number, number];
    imageExtensions: string[];
  };
  images: { widths: number[]; quality: number; ogWidth: number; concurrency: number };
  vision: { enabled: boolean; model: string };
  checkoutSheet: { csvUrl: string; spreadsheetId: string; range: string; localCsvPath: string };
  payhip: {
    buttonMode: 'embed' | 'link';
    embedTheme: string;
    linkTarget: 'product-page' | 'checkout';
    verifyOnline: boolean;
    lifetimeAccess: boolean;
  };
  offering: {
    paidProfile: string | null;
    freeProfile: string | null;
    profiles: Record<string, OfferingProfile>;
  };
  catalog: {
    productsPerPage: number;
    minCategorySize: number;
    featuredIds: string[];
    newPatternsCount: number;
    showDraftsInDev: boolean;
  };
  integrations: {
    googleSiteVerification: string;
    ga4MeasurementId: string;
    adsense: { enabled: boolean; client: string };
  };
}
