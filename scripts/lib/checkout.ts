/**
 * Payhip checkout mapping: product_id -> payhip_link.
 *
 * SAFETY RULES
 *  - Matching is by the complete, normalized product ID only (Map lookup). Never by row, order, title or partial text.
 *  - Spreadsheet content is NEVER executed. Embed code is only parsed to extract the Payhip product code.
 *  - Duplicate IDs or one Payhip code used by several IDs = critical error (no publication).
 *  - Missing / invalid / unapproved link => product stays draft. There is no fallback to another product's link.
 */
import fs from 'node:fs';
import path from 'node:path';
import { normalizeProductId } from './ids.ts';

export interface MappingRow {
  line: number;
  rawId: string;
  id: string | null;
  rawLink: string;
}

export interface ParsedLink {
  code: string;
  source: 'product-url' | 'checkout-url' | 'embed';
}

export interface MappingResult {
  map: Map<string, { code: string; source: ParsedLink['source']; line: number }>;
  critical: string[];
  warnings: string[];
}

/** Minimal RFC-4180 CSV parser (handles quotes, escaped quotes, commas and newlines in quoted fields). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const s = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

const CODE_RE = /^[A-Za-z0-9_]{3,40}$/;

/** Extracts checkout code from a Whop URL (e.g. https://whop.com/checkout/plan_xxx), Payhip URL or embed code. */
export function parseCheckoutLink(raw: string): ParsedLink | null {
  const v = raw.trim();
  if (!v) return null;

  // Direct plan code (e.g. plan_nkDSb3Z1taNSz)
  if (/^plan_[A-Za-z0-9_]+$/i.test(v)) {
    return { code: v, source: 'checkout-url' };
  }

  // Payhip embed button
  if (v.startsWith('<') || /payhip-buy-button|data-product\s*=/.test(v)) {
    const dataProduct = /data-product\s*=\s*["']([^"']+)["']/i.exec(v)?.[1]?.trim();
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(v)?.[1];
    const hrefCode = href ? parseCheckoutLink(href)?.code : undefined;
    if (dataProduct && hrefCode && dataProduct !== hrefCode) return null;
    const code = dataProduct ?? hrefCode;
    return code && CODE_RE.test(code) ? { code, source: 'embed' } : null;
  }

  let url: URL;
  try {
    url = new URL(v);
  } catch {
    return null;
  }

  // Whop checkout link (e.g. https://whop.com/checkout/plan_xxx)
  if (/^(www\.)?whop\.com$/i.test(url.hostname)) {
    const whopMatch = /^\/checkout\/([A-Za-z0-9_]+)\/?$/.exec(url.pathname);
    if (whopMatch && CODE_RE.test(whopMatch[1])) {
      return { code: whopMatch[1], source: 'checkout-url' };
    }
  }

  // Payhip link
  if (url.protocol === 'https:' && /^(www\.)?payhip\.com$/i.test(url.hostname)) {
    const b = /^\/b\/([A-Za-z0-9]+)\/?$/.exec(url.pathname);
    if (b && CODE_RE.test(b[1])) return { code: b[1], source: 'product-url' };
    if (/^\/buy\/?$/.test(url.pathname)) {
      const link = url.searchParams.get('link');
      if (link && CODE_RE.test(link)) return { code: link, source: 'checkout-url' };
    }
  }

  return null;
}

export const parsePayhipLink = parseCheckoutLink;

export function readMappingRows(csvText: string): { rows: MappingRow[]; headerError: string | null } {
  const table = parseCsv(csvText);
  if (!table.length) return { rows: [], headerError: null };
  const header = table[0].map((h) => h.trim().toLowerCase());
  const idCol = header.indexOf('product_id');
  const linkCol = header.findIndex((h) => h === 'checkout_link' || h === 'payhip_link' || h === 'whop_link');
  if (idCol === -1 || linkCol === -1) {
    return { rows: [], headerError: `The checkout sheet must have the columns "product_id" and "checkout_link" (or "payhip_link") in the first row (found: ${table[0].join(', ')}).` };
  }
  const rows = table.slice(1).map((r, i) => ({
    line: i + 2,
    rawId: (r[idCol] ?? '').trim(),
    id: normalizeProductId(r[idCol] ?? ''),
    rawLink: (r[linkCol] ?? '').trim(),
  }));
  return { rows, headerError: null };
}

export function validateMapping(csvText: string, knownIds: Set<string>, paidIds: Set<string>): MappingResult {
  const critical: string[] = [];
  const warnings: string[] = [];
  const map: MappingResult['map'] = new Map();
  const { rows, headerError } = readMappingRows(csvText);
  if (headerError) return { map, critical: [headerError], warnings };

  const seen = new Map<string, number>();
  const codeOwners = new Map<string, string>();

  for (const row of rows) {
    if (!row.rawId && !row.rawLink) continue;
    if (!row.id) {
      critical.push(`Checkout sheet line ${row.line}: "${row.rawId}" is not a valid product ID (expected K followed by a number, e.g. K24).`);
      continue;
    }
    if (seen.has(row.id)) {
      critical.push(`Checkout sheet: duplicate product ID ${row.id} on lines ${seen.get(row.id)} and ${row.line}. Each product may appear only once.`);
      map.delete(row.id);
      continue;
    }
    seen.set(row.id, row.line);
    if (!row.rawLink) {
      warnings.push(`Checkout sheet line ${row.line}: ${row.id} has no Payhip link.`);
      continue;
    }
    const parsed = parsePayhipLink(row.rawLink);
    if (!parsed) {
      warnings.push(`Checkout sheet line ${row.line}: ${row.id} has an invalid or unsupported Payhip link ("${row.rawLink.slice(0, 80)}"). The product stays draft.`);
      continue;
    }
    const owner = codeOwners.get(parsed.code);
    if (owner && owner !== row.id) {
      critical.push(`Checkout sheet: Payhip product "${parsed.code}" is assigned to both ${owner} and ${row.id}. One Payhip product cannot belong to two patterns.`);
      continue;
    }
    codeOwners.set(parsed.code, row.id);
    if (!knownIds.has(row.id)) warnings.push(`Checkout sheet line ${row.line}: ${row.id} does not exist in the product catalog (link ignored).`);
    else if (!paidIds.has(row.id)) warnings.push(`Checkout sheet line ${row.line}: ${row.id} is a FREE product; its Payhip link is ignored.`);
    map.set(row.id, { code: parsed.code, source: parsed.source, line: row.line });
  }
  // A duplicated ID must not keep either link.
  for (const msg of critical) {
    const m = /duplicate product ID (K\d+)/.exec(msg);
    if (m) map.delete(m[1]);
  }
  return { map, critical, warnings };
}

export interface MappingSource {
  text: string | null;
  origin: string;
  fromCache: boolean;
  warnings: string[];
}

/**
 * Loads the checkout sheet. Order: Google Sheets API -> published CSV URL -> local CSV file.
 * If the online sheet cannot be reached, the last successfully validated copy is used instead.
 */
export async function loadMappingSource(opts: {
  root: string;
  csvUrl: string;
  spreadsheetId: string;
  range: string;
  apiKey: string;
  localCsvPath: string;
  cacheFile: string;
}): Promise<MappingSource> {
  const warnings: string[] = [];
  const tryFetch = async (url: string) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  };

  if (opts.spreadsheetId && opts.apiKey) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(opts.spreadsheetId)}/values/${encodeURIComponent(opts.range)}?key=${encodeURIComponent(opts.apiKey)}`;
      const json = JSON.parse(await tryFetch(url)) as { values?: string[][] };
      const csv = (json.values ?? []).map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      return { text: csv, origin: 'Google Sheets API', fromCache: false, warnings };
    } catch (e) {
      warnings.push(`Google Sheets API could not be read (${(e as Error).message}).`);
    }
  } else if (opts.csvUrl) {
    try {
      const text = await tryFetch(opts.csvUrl);
      if (/^\s*<(!doctype|html)/i.test(text)) throw new Error('the link returned a web page, not CSV - check that the sheet is published as CSV');
      return { text, origin: 'Google Sheet (CSV link)', fromCache: false, warnings };
    } catch (e) {
      warnings.push(`Google Sheet CSV could not be read (${(e as Error).message}).`);
    }
  } else {
    const local = path.resolve(opts.root, opts.localCsvPath);
    if (fs.existsSync(local)) return { text: fs.readFileSync(local, 'utf8'), origin: `local file ${opts.localCsvPath}`, fromCache: false, warnings };
    warnings.push('No checkout sheet is configured.');
    return { text: null, origin: 'none', fromCache: false, warnings };
  }

  if (fs.existsSync(opts.cacheFile)) {
    warnings.push('Using the last successfully validated copy of the checkout sheet instead. Existing checkout data was NOT changed.');
    return { text: fs.readFileSync(opts.cacheFile, 'utf8'), origin: 'last validated copy (cache)', fromCache: true, warnings };
  }
  warnings.push('No saved copy of the checkout sheet exists yet, so all paid products stay draft.');
  return { text: null, origin: 'unavailable', fromCache: false, warnings };
}

export function checkoutUrls(code: string) {
  if (code.startsWith('plan_')) {
    const url = `https://whop.com/checkout/${code}`;
    return { productUrl: url, checkoutUrl: url, provider: 'whop' };
  }
  return { productUrl: `https://payhip.com/b/${code}`, checkoutUrl: `https://payhip.com/buy?link=${code}`, provider: 'payhip' };
}

export const payhipUrls = checkoutUrls;

/**
 * Optional helper: opens the public Payhip product page and checks that its title mentions the product subject.
 * This can only SUPPORT the manual approval; it never approves anything by itself.
 */
export async function checkPayhipOnline(code: string, niche: string): Promise<{ result: 'match' | 'mismatch' | 'unavailable'; title?: string; price?: string }> {
  try {
    const res = await fetch(payhipUrls(code).productUrl, { signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'Mozilla/5.0 (catalog link check)' } });
    if (!res.ok) return { result: 'unavailable', title: `HTTP ${res.status}` };
    const html = await res.text();
    const og = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1];
    const title = (og ?? /<title>([^<]+)<\/title>/i.exec(html)?.[1] ?? '').trim();
    const price = /<meta[^>]+property=["'](?:product:price:amount|og:price:amount)["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1];
    if (!title) return { result: 'unavailable' };
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
    return { result: norm(title).includes(norm(niche).trim()) ? 'match' : 'mismatch', title, price };
  } catch {
    return { result: 'unavailable' };
  }
}
