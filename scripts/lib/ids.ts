/** Product ID rules. The ID ("K" or "B" + positive integer, or "KC" + 3 digits) is the key used to relate data. */

const STRICT_ID = /^([KB])([1-9]\d*)$/;
const KC_ID = /^(KC)(\d{3,})$/;

/** Normalizes user input such as " k24 " to "K24", " b3 " to "B3", " kc001 " to "KC001". Returns null for invalid IDs. */
export function normalizeProductId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toUpperCase();
  const m = STRICT_ID.exec(s);
  if (m) return `${m[1]}${m[2]}`;
  const mkc = KC_ID.exec(s);
  if (mkc) return `${mkc[1]}${mkc[2]}`;
  return null;
}

/** Outer product folders must be named exactly K<number>, B<number>, or KC<number> (case-insensitive). */
export function parseOuterFolderName(name: string): { id: string; number: number } | null {
  const id = normalizeProductId(name);
  if (!id || name.trim() !== name) return null;
  return { id, number: idNumber(id) };
}

export function idNumber(id: string): number {
  if (id.startsWith('KC')) {
    return 1000 + Number(id.slice(2));
  }
  return Number(id.replace(/^[A-Z]+/, ''));
}

export function compareIds(a: string, b: string): number {
  return idNumber(a) - idNumber(b);
}

const FREE_PRODUCT_IDS = new Set(['K3', 'K7', 'K11']);

export function isFreeNumber(n: number, range: [number, number], id?: string): boolean {
  if (id) {
    return FREE_PRODUCT_IDS.has(id.toUpperCase());
  }
  return n === 3 || n === 7 || n === 11;
}
