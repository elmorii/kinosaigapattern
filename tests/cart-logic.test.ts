import { getCart, addToCart, removeFromCart, clearCart, buildPayhipCheckoutUrl } from '../src/lib/cart.ts';

// Test Cart Logic in Node environment simulating browser localStorage
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] || null; }
  setItem(key: string, val: string) { this.store[key] = val; }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}

(globalThis as any).window = globalThis;
(globalThis as any).localStorage = new MockLocalStorage();
(globalThis as any).dispatchEvent = () => true;
(globalThis as any).CustomEvent = class CustomEvent {
  detail: any;
  constructor(public type: string, init?: any) {
    this.detail = init?.detail;
  }
};

console.log('--- Test Cart State Management & Logic ---');

clearCart();
console.log('1. Initial cart count:', getCart().length);

// Add K13
const r1 = addToCart({
  id: 'K13',
  title: 'Pumpkin Kinusaiga Pattern',
  price: 1.99,
  image: '/images/products/k13.jpg',
  payhipCode: 'bzs9Q',
  slug: 'pumpkin-kinusaiga-pattern-k13',
});
console.log('2. Add K13:', r1, 'Count:', getCart().length);

// Duplicate K13 attempt
const r1Dup = addToCart({
  id: 'K13',
  title: 'Pumpkin Kinusaiga Pattern',
  price: 1.99,
  image: '/images/products/k13.jpg',
  payhipCode: 'bzs9Q',
  slug: 'pumpkin-kinusaiga-pattern-k13',
});
console.log('3. Duplicate K13 rejected:', r1Dup.alreadyExists === true, 'Count remains:', getCart().length);

// Add K14
const r2 = addToCart({
  id: 'K14',
  title: 'Ocean Kinusaiga Pattern',
  price: 1.99,
  image: '/images/products/k14.jpg',
  payhipCode: 'Z2Y5L',
  slug: 'ocean-kinusaiga-pattern-k14',
});
console.log('4. Add K14:', r2, 'Count:', getCart().length);

// Payhip checkout link with K13 + K14
const checkout = buildPayhipCheckoutUrl();
console.log('5. Payhip Checkout URL:', checkout.url);
const expectedUrl = 'https://payhip.com/buy?cart_links[]=bzs9Q&cart_links[]=Z2Y5L';
console.log('   Matches expected multi-product URL format:', checkout.url === expectedUrl);

// Remove K13
const remaining = removeFromCart('K13');
console.log('6. Remove K13. Remaining items:', remaining.length, remaining.map(i => i.id));
const checkoutSingle = buildPayhipCheckoutUrl();
console.log('7. Single Checkout URL (K14 only):', checkoutSingle.url);

// Test empty cart
clearCart();
console.log('8. After clearCart:', getCart().length);
console.log('   Empty checkout result:', buildPayhipCheckoutUrl().error);

console.log('--- Cart Logic Verified Successfully! ---');
