import fs from 'node:fs';
import path from 'node:path';
import type { Catalog, Product, ShopConfig } from './types.ts';

const PROJECT_ROOT = path.resolve(process.cwd());
const CATALOG_PATH = path.join(PROJECT_ROOT, 'src/data/catalog.json');
const CONFIG_PATH = path.join(PROJECT_ROOT, 'shop.config.json');

export function getShopConfig(): ShopConfig {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

export function getCatalog(): Catalog {
  if (!fs.existsSync(CATALOG_PATH)) {
    return { generatedAt: null, generatorVersion: 1, products: [] };
  }
  return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
}

export function getAllProducts(includeDrafts = false): Product[] {
  const cat = getCatalog();
  if (includeDrafts) return cat.products;
  return cat.products.filter((p) => p.status === 'published' && !p.hidden);
}

export function getFreeProducts(includeDrafts = false): Product[] {
  return getAllProducts(includeDrafts).filter((p) => p.type === 'free');
}

export function getPaidProducts(includeDrafts = false): Product[] {
  return getAllProducts(includeDrafts).filter((p) => p.type === 'paid');
}

export function getProductById(id: string): Product | undefined {
  return getAllProducts(true).find((p) => p.id.toUpperCase() === id.toUpperCase());
}

export function getProductBySlug(slug: string): Product | undefined {
  return getAllProducts(true).find((p) => p.slug === slug || (p.previousSlugs && p.previousSlugs.includes(slug)));
}

export function getCategories(includeDrafts = true, paidOnly = true): { name: string; slug: string; count: number }[] {
  let products = getAllProducts(includeDrafts);
  if (paidOnly) {
    products = products.filter((p) => p.type === 'paid');
  }

  const map = new Map<string, { slug: string; count: number }>();
  for (const p of products) {
    const existing = map.get(p.category);
    if (existing) {
      existing.count++;
    } else {
      map.set(p.category, { slug: p.categorySlug, count: 1 });
    }
  }

  // Load configured order from data/categories.json if available
  const orderMap = new Map<string, number>();
  const categoriesCfgPath = path.join(PROJECT_ROOT, 'data/categories.json');
  if (fs.existsSync(categoriesCfgPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(categoriesCfgPath, 'utf8'));
      if (Array.isArray(cfg.categories)) {
        cfg.categories.forEach((c: { name: string }, idx: number) => {
          orderMap.set(c.name.toLowerCase(), idx);
        });
      }
    } catch {}
  }

  return Array.from(map.entries())
    .map(([name, val]) => ({ name, slug: val.slug, count: val.count }))
    .sort((a, b) => {
      const orderA = orderMap.has(a.name.toLowerCase()) ? orderMap.get(a.name.toLowerCase())! : 999;
      const orderB = orderMap.has(b.name.toLowerCase()) ? orderMap.get(b.name.toLowerCase())! : 999;
      if (orderA !== orderB) return orderA - orderB;
      return b.count - a.count;
    });
}
