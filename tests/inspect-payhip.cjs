const fs = require('fs');

async function run() {
  const r = await fetch('https://payhip.com/js/payhip.js?v=24u69015');
  const js = await r.text();
  
  let pos = 0;
  while ((pos = js.indexOf('window.open', pos + 1)) !== -1) {
    console.log('--- Found window.open at', pos, '---');
    console.log(js.slice(pos - 100, pos + 400));
  }
}
run().catch(console.error);
