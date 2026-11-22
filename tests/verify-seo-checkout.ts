async function testAll() {
  const base = 'http://localhost:4321';

  // 1. Sitemap.xml Check
  const sitemapRes = await fetch(base + '/sitemap.xml');
  console.log('1. /sitemap.xml status:', sitemapRes.status, 'Is 200 OK:', sitemapRes.status === 200);

  // 2. Palm tree K72 SEO Checks
  const k72Res = await fetch(base + '/products/palm-tree-kinusaiga-pattern-k72');
  const k72Html = await k72Res.text();

  const titleMatch = k72Html.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1] : '';
  console.log('2. Meta Title:', title, '| Length:', title.length, '| Optimal (40-60):', title.length >= 40 && title.length <= 60);

  const descMatch = k72Html.match(/<meta name="description" content="([^"]+)"/);
  const desc = descMatch ? descMatch[1] : '';
  console.log('3. Meta Description:', desc, '| Length:', desc.length, '| Optimal (140-160):', desc.length >= 140 && desc.length <= 160);

  const h1Match = k72Html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const h1 = h1Match ? h1Match[1] : '';
  console.log('4. H1 Content:', h1);
  console.log('   Includes niche keyword variations:', h1.includes('Palm Tree Kinusaiga Pattern') && h1.includes('Kinusaiga Palm Tree Pattern'));

  const h2Matches = [...k72Html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map(m => m[1]);
  console.log('5. H2 Headings count:', h2Matches.length);
  console.log('   H2 list:');
  h2Matches.forEach(h => console.log('    -', h));
  console.log('   Contains "Shopping Cart" in H2 (should be FALSE):', h2Matches.includes('Shopping Cart'));

  // 3. Checkout Verification
  const k14Res = await fetch(base + '/products/ocean-kinusaiga-pattern-k14');
  const k14Html = await k14Res.text();
  console.log('6. K14 has Buy Now button:', k14Html.includes('Buy Now'));
  console.log('   K14 has Add to Cart button:', k14Html.includes('Add to Cart'));
  console.log('   Has cart drawer #cart-drawer:', k72Html.includes('id="cart-drawer"'));

  // 4. Free products check
  const freeRes = await fetch(base + '/free-patterns');
  const freeHtml = await freeRes.text();
  console.log('7. Free patterns page contains K3:', freeHtml.includes('sunflower-kinusaiga-pattern-k3'));
  console.log('   Free patterns page contains K7:', freeHtml.includes('turtle-kinusaiga-pattern-k7'));
  console.log('   Free patterns page contains K11:', freeHtml.includes('coffee-cup-kinusaiga-pattern-k11'));
  console.log('   Free patterns page does NOT contain K1 (now paid):', !freeHtml.includes('horse-kinusaiga-pattern-k1'));

  // 5. K1 (previously free) is now paid
  const k1Res = await fetch(base + '/products/horse-kinusaiga-pattern-k1');
  const k1Html = await k1Res.text();
  console.log('8. K1 has Buy Now (paid):', k1Html.includes('Buy Now'));
  console.log('   K1 does NOT have free download modal:', !k1Html.includes('free-modal-overlay'));
}

testAll().catch(console.error);
