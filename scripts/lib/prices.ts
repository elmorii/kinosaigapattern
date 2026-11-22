import fs from 'node:fs';
import path from 'node:path';
import { parseCsv } from './checkout.ts';
import { normalizeProductId } from './ids.ts';

export interface PriceRecord {
  price: number;
  currency: string;
}

export function loadPrices(csvPath: string): { map: Map<string, PriceRecord>; errors: string[] } {
  const map = new Map<string, PriceRecord>();
  const errors: string[] = [];
  if (!fs.existsSync(csvPath)) {
    return { map, errors };
  }
  const text = fs.readFileSync(csvPath, 'utf8');
  const table = parseCsv(text);
  if (!table.length) return { map, errors };

  const header = table[0].map((h) => h.trim().toLowerCase());
  const idCol = header.indexOf('product_id');
  const priceCol = header.indexOf('price');
  const curCol = header.indexOf('currency');

  if (idCol === -1 || priceCol === -1) {
    errors.push(`Price file "${csvPath}" must contain product_id and price columns.`);
    return { map, errors };
  }

  for (let i = 1; i < table.length; i++) {
    const row = table[i];
    const rawId = row[idCol]?.trim();
    if (!rawId) continue;
    const id = normalizeProductId(rawId);
    if (!id) {
      errors.push(`Price line ${i + 1}: Invalid product ID "${rawId}"`);
      continue;
    }
    const rawPrice = row[priceCol]?.trim().replace('$', '');
    const priceNum = parseFloat(rawPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      errors.push(`Price line ${i + 1}: Invalid price "${row[priceCol]}" for ${id}`);
      continue;
    }
    const currency = (curCol !== -1 && row[curCol]?.trim()) ? row[curCol].trim().toUpperCase() : 'USD';
    map.set(id, { price: priceNum, currency });
  }

  return { map, errors };
}
