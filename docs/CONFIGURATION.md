# Kinusaiga Pattern Store – Configuration Guide

This website is statically generated using the Astro framework and optimized for deployment on Hostinger or any static web host.

---

## 1. Project Locations

- **Source Products Folder:** `Documents\A To Copy` (containing `K1` through `K63+`)
- **Website Codebase:** `Documents\First Digital Shop`
- **Settings Configuration:** `Documents\First Digital Shop\shop.config.json`
- **Private Environment:** `Documents\First Digital Shop\.env` (copy from `.env.example`)

---

## 2. Configuration Settings (`shop.config.json`)

Before deploying to your production domain:

1. **`shop.siteUrl`**: Set to your custom domain (e.g. `https://www.yourdomain.com`).
2. **`shop.contactEmail`**: Set your real support email (e.g. `support@yourdomain.com`).
3. **`checkoutSheet.csvUrl`**: If using Google Sheets, paste the published CSV URL here or in `.env` as `CHECKOUT_SHEET_CSV_URL`.
4. **`offering.paidProfile`**: Set to `"standard-10"` once you have verified that your paid downloads contain the 10 sizes and PDF/PNG formats.
5. **`integrations.googleSiteVerification`**: Paste your Google Search Console verification code.

---

## 3. Connecting Payhip & Google Sheets

### Google Sheet Format
Create a Google Sheet with two columns:
- Column A: `product_id` (e.g., `K13`, `K24`, `K53`)
- Column B: `payhip_link` (e.g., `https://payhip.com/b/XXXX` or Payhip embed code)

Publish the sheet as CSV:
`File > Share > Publish to web > Format: Comma-separated values (.csv)`

### Approving Links
Run:
```bash
npm run approve-checkout
```
This records the approved Payhip code in `data/checkout-approvals.json` to prevent unintended link mismatches.

---

## 4. One-Click Windows Update Workflow

Whenever you add new product folders to `A To Copy`:
1. Double-click **`Update Website.bat`** in the `First Digital Shop` folder.
2. The script will:
   - Run the catalog importer & image optimizer
   - Validate and map Payhip links
   - Build the production static site in `dist/`
   - Run security checks ensuring paid pattern files are never exposed in public assets
3. Inspect `reports/import-report.md` for a summary of published and draft products.

---

## 5. Previewing Locally

To test the site in your browser:
```bash
npm run preview
```
Visit `http://localhost:4321`.
