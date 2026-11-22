import fs from 'node:fs';
import path from 'node:path';
import type { Product, ProductDescription, SizeOption } from '../../src/lib/types.ts';

export interface ProductOverride {
  niche?: string;
  title?: string;
  seoTitle?: string;
  metaDescription?: string;
  summary?: string;
  category?: string;
  tags?: string[];
  featured?: boolean;
  status?: 'published' | 'draft';
  hidden?: boolean;
  slug?: string;
  offeringProfile?: string;
  price?: number;
  currency?: string;
  imageAlts?: Record<string, string>; // index as string (e.g. "1", "2")
  imageCaptions?: Record<string, string>;
  description?: Partial<ProductDescription>;
  sizes?: SizeOption[];
  formats?: string[];
}

export function loadOverrides(dirPath: string): Map<string, ProductOverride> {
  const map = new Map<string, ProductOverride>();
  if (!fs.existsSync(dirPath)) return map;

  const files = fs.readdirSync(dirPath);
  for (const f of files) {
    if (!f.endsWith('.json') || f.startsWith('_')) continue;
    const id = path.parse(f).name.toUpperCase();
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dirPath, f), 'utf8'));
      map.set(id, data);
    } catch (e) {
      console.error(`Error loading override for ${f}:`, e);
    }
  }
  return map;
}

export function applyOverride(product: Product, override: ProductOverride | undefined) {
  if (!override) return;

  if (override.niche) product.niche = override.niche;
  if (override.title) product.title = override.title;
  if (override.seoTitle) product.seoTitle = override.seoTitle;
  if (override.metaDescription) product.metaDescription = override.metaDescription;
  if (override.summary) product.summary = override.summary;
  if (override.category) {
    product.category = override.category;
    // update categorySlug if needed
  }
  if (override.tags) product.tags = override.tags;
  if (override.featured !== undefined) product.featured = override.featured;
  if (override.status === 'draft') product.status = 'draft';
  if (override.hidden !== undefined) product.hidden = override.hidden;
  if (override.slug) product.slug = override.slug;
  if (override.offeringProfile !== undefined) product.offeringProfile = override.offeringProfile;
  if (override.price !== undefined) product.price = override.price;
  if (override.currency !== undefined) product.currency = override.currency;
  if (override.formats) product.formats = override.formats;
  if (override.sizes) product.sizes = override.sizes;

  if (override.imageAlts) {
    for (const img of product.images) {
      const customAlt = override.imageAlts[String(img.index)];
      if (customAlt) {
        img.alt = customAlt;
        img.altSource = 'override';
        img.altNeedsReview = false;
      }
    }
  }

  if (override.imageCaptions) {
    for (const img of product.images) {
      const customCap = override.imageCaptions[String(img.index)];
      if (customCap) {
        img.caption = customCap;
      }
    }
  }

  if (override.description) {
    product.description = {
      ...product.description,
      ...override.description,
    };
  }
}
