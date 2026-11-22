import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProductId, parseOuterFolderName, isFreeNumber, compareIds } from '../scripts/lib/ids.ts';
import { extractNiche } from '../scripts/lib/niche.ts';
import { sortImageFiles } from '../scripts/lib/images.ts';
import { parsePayhipLink, validateMapping } from '../scripts/lib/checkout.ts';

test('Product ID Normalization and Discrimination (K1 vs K10 vs K100)', () => {
  assert.equal(normalizeProductId('K1'), 'K1');
  assert.equal(normalizeProductId('k1'), 'K1');
  assert.equal(normalizeProductId('K10'), 'K10');
  assert.equal(normalizeProductId('K100'), 'K100');
  assert.notEqual(normalizeProductId('K1'), normalizeProductId('K10'));
  assert.notEqual(normalizeProductId('K10'), normalizeProductId('K100'));
  assert.equal(normalizeProductId('invalid'), null);
  assert.equal(normalizeProductId('K01'), null);
});

test('Outer Folder Parsing', () => {
  assert.deepEqual(parseOuterFolderName('K7'), { id: 'K7', number: 7 });
  assert.deepEqual(parseOuterFolderName('k24'), { id: 'K24', number: 24 });
  assert.equal(parseOuterFolderName('Some Folder'), null);
});

test('Free vs Paid Classification (K3, K7, K11 free, others paid)', () => {
  assert.equal(isFreeNumber(3, [1, 12], 'K3'), true);
  assert.equal(isFreeNumber(7, [1, 12], 'K7'), true);
  assert.equal(isFreeNumber(11, [1, 12], 'K11'), true);
  assert.equal(isFreeNumber(1, [1, 12], 'K1'), false);
  assert.equal(isFreeNumber(4, [1, 12], 'K4'), false);
  assert.equal(isFreeNumber(13, [1, 12], 'K13'), false);
  assert.equal(isFreeNumber(24, [1, 12], 'K24'), false);
  assert.equal(isFreeNumber(53, [1, 12], 'K53'), false);
});

test('Niche Extraction Rules', () => {
  // Test A - Turtle
  assert.equal(extractNiche('kinusaiga turtle pattern - K7').niche, 'Turtle');
  // Test B - Quilt
  assert.equal(extractNiche('kinusaiga quilt pattern - K12').niche, 'Quilt');
  // Test C - Hummingbird
  assert.equal(extractNiche('Kinusaiga hummingbird pattern K24').niche, 'Hummingbird');
  // Multi-word niche
  assert.equal(extractNiche('K45 Kinusaiga Sea Turtle pattern').niche, 'Sea Turtle');
  assert.equal(extractNiche('kinusaiga highland cow pattern - K50').niche, 'Highland Cow');
  // Fallback when "pattern" is absent or after kinusaiga
  assert.equal(extractNiche('K53 kinusaiga unicorn').niche, 'Unicorn');
});

test('Numeric Image Sorting', () => {
  const files = ['10.png', '1.png', '2.png', '9.png'];
  const { sorted } = sortImageFiles(files);
  assert.deepEqual(sorted, ['1.png', '2.png', '9.png', '10.png']);
});

test('Payhip Link Parsing & Exact ID Mapping Validation', () => {
  const link1 = 'https://payhip.com/b/Ab12';
  const parsed1 = parsePayhipLink(link1);
  assert.equal(parsed1?.code, 'Ab12');

  const link2 = '<a href="https://payhip.com/b/Cd34" class="payhip-buy-button" data-product="Cd34">Buy Now</a>';
  const parsed2 = parsePayhipLink(link2);
  assert.equal(parsed2?.code, 'Cd34');

  // Duplicate ID detection in checkout mapping
  const csv = `product_id,payhip_link\nK24,https://payhip.com/b/Ab12\nK24,https://payhip.com/b/Cd34`;
  const res = validateMapping(csv, new Set(['K24']), new Set(['K24']));
  assert.equal(res.critical.length > 0, true);
  assert.match(res.critical[0], /duplicate product ID K24/i);
});
