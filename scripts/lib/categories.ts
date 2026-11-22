import fs from 'node:fs';
import path from 'node:path';
import { slugify } from './text.ts';

export interface CategoryRule {
  name: string;
  keywords: string[];
}

export interface CategoryConfig {
  fallback: string;
  categories: CategoryRule[];
}

export function loadCategoriesConfig(filePath: string): CategoryConfig {
  if (!fs.existsSync(filePath)) {
    return {
      fallback: 'Other Designs',
      categories: [],
    };
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as CategoryConfig;
}

export function matchCategory(niche: string, config: CategoryConfig): { category: string; categorySlug: string } {
  const normNiche = ` ${niche.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
  let bestMatch: string | null = null;
  let bestLen = 0;

  for (const cat of config.categories) {
    for (const kw of cat.keywords) {
      const normKw = ` ${kw.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
      if (normNiche.includes(normKw)) {
        if (normKw.length > bestLen) {
          bestLen = normKw.length;
          bestMatch = cat.name;
        }
      }
    }
  }

  const category = bestMatch || config.fallback;
  return {
    category,
    categorySlug: slugify(category),
  };
}
