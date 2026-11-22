// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cfg = JSON.parse(fs.readFileSync(new URL('./shop.config.json', import.meta.url), 'utf8'));
const site = (cfg.shop.siteUrl || 'https://www.your-domain.com').trim().replace(/\/+$/, '');

function sitemapXmlAliasIntegration() {
  return {
    name: 'sitemap-xml-alias',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const distDir = fileURLToPath(dir);
        const indexPath = path.join(distDir, 'sitemap-index.xml');
        const sitemapPath = path.join(distDir, 'sitemap.xml');
        if (fs.existsSync(indexPath)) {
          fs.copyFileSync(indexPath, sitemapPath);
        }
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site,
  trailingSlash: 'ignore',
  integrations: [sitemap(), sitemapXmlAliasIntegration()],
  build: { format: 'directory' },
  compressHTML: true,
  devToolbar: { enabled: false },
});
