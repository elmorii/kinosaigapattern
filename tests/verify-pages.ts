async function verifyPages() {
  const base = 'http://localhost:4321';

  // 1. Check Paid Product K13
  const k13Res = await fetch(`${base}/products/pumpkin-kinusaiga-pattern-k13`);
  const k13Html = await k13Res.text();

  console.log('=== K13 Paid Product Page Verification ===');
  console.log('K13 HTTP Status:', k13Res.status);
  console.log('Has Buy Now button:', k13Html.includes('Buy Now'));
  console.log('Buy Now has payhip-buy-button class:', k13Html.includes('payhip-buy-button'));
  console.log('Has Add to Cart button:', k13Html.includes('Add to Cart'));
  console.log('Add to Cart has correct ID K13:', k13Html.includes('data-product-id="K13"'));
  console.log('Add to Cart has payhip code bzs9Q:', k13Html.includes('data-payhip-code="bzs9Q"'));
  console.log('Add to Cart has cart icon SVG:', k13Html.includes('btn-cart-icon'));
  console.log('Add to Cart has NO payhip-add-to-cart-button (no hijacking):', !k13Html.includes('payhip-add-to-cart-button'));
  console.log('Does NOT have free download modal:', !k13Html.includes('free-modal-overlay'));

  // 2. Check Paid Product K14
  const k14Res = await fetch(`${base}/products/ocean-kinusaiga-pattern-k14`);
  const k14Html = await k14Res.text();
  console.log('\n=== K14 Paid Product Page Verification ===');
  console.log('K14 HTTP Status:', k14Res.status);
  console.log('Add to Cart has correct ID K14:', k14Html.includes('data-product-id="K14"'));
  console.log('Add to Cart has payhip code Z2Y5L:', k14Html.includes('data-payhip-code="Z2Y5L"'));

  // 3. Check Free Product K1
  const k1Res = await fetch(`${base}/products/horse-kinusaiga-pattern-k1`);
  const k1Html = await k1Res.text();
  console.log('\n=== K1 Free Product Page Verification ===');
  console.log('K1 HTTP Status:', k1Res.status);
  console.log('Has Download Free Pattern button:', k1Html.includes('Download Free Pattern'));
  console.log('Has free download welcome popup:', k1Html.includes('Welcome to Our Kinusaiga Pattern Shop!'));
  console.log('Does NOT have Buy Now button:', !k1Html.includes('payhip-buy-button') && !k1Html.includes('>Buy Now<'));
  console.log('Does NOT have Add to Cart button:', !k1Html.includes('add-to-cart-btn') && !k1Html.includes('>Add to Cart<'));

  // 4. Check Global Elements (Header Cart & Drawer)
  console.log('\n=== Global Cart Elements Verification ===');
  console.log('Header has cart button #header-cart-btn:', k13Html.includes('id="header-cart-btn"'));
  console.log('Header has cart badge #header-cart-badge:', k13Html.includes('id="header-cart-badge"'));
  console.log('Page has cart drawer #cart-drawer:', k13Html.includes('id="cart-drawer"'));
  console.log('Cart drawer has checkout button #cart-checkout-button:', k13Html.includes('id="cart-checkout-button"'));
  console.log('Cart drawer has empty view #cart-empty-view:', k13Html.includes('id="cart-empty-view"'));
  console.log('Cart drawer has subtotal #cart-subtotal-amount:', k13Html.includes('id="cart-subtotal-amount"'));
}

verifyPages().catch(console.error);
