/**
 * Generates product titles, SEO metadata, keywords and descriptions from the owner's
 * standard description template. "#" in the owner's template = the full product niche.
 *
 * Honesty rules built in:
 *  - Size / format / no-background claims appear ONLY when an offering profile is verified.
 *  - "Lifetime access" appears ONLY when payhip.lifetimeAccess = true.
 *  - Paid products get Payhip instructions, free products get direct-download instructions.
 */
import crypto from 'node:crypto';
import type { FreeDownload, OfferingProfile, ProductDescription, ProductFaq, ProductType } from '../../src/lib/types.ts';

export const GENERATOR_VERSION = 2;

const PROPER_WORDS = new Set(['thanksgiving', 'christmas', 'halloween', 'easter', 'valentine', 'viking', 'japanese', 'santa']);

/** Niche as used inside sentences: "Highland Cow" -> "highland cow", but "Thanksgiving" stays capitalized. */
export function proseNiche(niche: string): string {
  return niche
    .split(' ')
    .map((w) => (PROPER_WORDS.has(w.toLowerCase()) ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()))
    .join(' ');
}

export function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function productSlug(id: string, niche: string): string {
  return `${slugify(niche)}-kinusaiga-pattern-${id.toLowerCase()}`;
}

function pick<T>(id: string, options: T[]): T {
  const h = crypto.createHash('md5').update(id).digest();
  return options[h[0] % options.length];
}

function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export interface TextContext {
  id: string;
  niche: string;
  type: ProductType;
  offering: OfferingProfile | null;
  download: FreeDownload | null;
  lifetimeAccess: boolean;
}

function offeringFacts(o: OfferingProfile | null) {
  if (!o) return null;
  const circle = o.sizes.filter((s) => s.shape === 'circle').length;
  const rect = o.sizes.length - circle;
  const sizeText =
    circle > 0
      ? `${o.sizes.length} size options (${rect} square and rectangular sizes plus ${circle === 1 ? 'one circle design border shape' : `${circle} circle shapes`})`
      : `${o.sizes.length} size options`;
  return { count: o.sizes.length, sizeText, formats: listJoin(o.formats), formatsArr: o.formats, noBg: o.noBackgroundVersion };
}

export function generateTitles(ctx: TextContext) {
  const N = ctx.niche;
  const o = offeringFacts(ctx.offering);
  if (ctx.type === 'free') {
    return {
      title: `Free ${N} Kinusaiga Pattern – Printable Fabric Art Template`,
      seoTitle: `Free ${N} Kinusaiga Pattern PDF – Printable Template`,
    };
  }
  const fmt = o && o.formatsArr.length ? ` (${o.formatsArr.join(' & ')})` : '';
  return {
    title: `${N} Kinusaiga Pattern – Printable Fabric Art Template`,
    seoTitle: `${N} Kinusaiga Pattern${fmt} – Printable Fabric Art Template`,
  };
}

export function generateMetaDescription(ctx: TextContext): string {
  const n = proseNiche(ctx.niche);
  const o = offeringFacts(ctx.offering);
  if (ctx.type === 'free') {
    return `Download a free ${n} Kinusaiga pattern (PDF) for no-sew Japanese fabric art. No purchase required – print the template and start your project.`;
  }
  const details = o ? ` in ${o.formats} with ${o.count} size options` : '';
  return `Printable ${n} Kinusaiga pattern for no-sew Japanese fabric art. Digital download${details}. Print the template and create your own ${n} fabric picture.`;
}

export function generateSummary(ctx: TextContext): string {
  const n = proseNiche(ctx.niche);
  const o = offeringFacts(ctx.offering);
  if (ctx.type === 'free') {
    return `A free printable ${n} Kinusaiga template for no-sew Japanese fabric art. Download the PDF right away – no purchase or account required.`;
  }
  return `A printable ${n} Kinusaiga template for no-sew Japanese fabric art${o ? `, delivered as ${o.formats} files in ${o.count} size options` : ''}. Digital download only – no physical item is shipped.`;
}

/** Owner's keyword library with "#" replaced by the full niche. Used for search, tags and natural copy. */
export function generateKeywords(ctx: TextContext): string[] {
  const n = proseNiche(ctx.niche);
  const o = offeringFacts(ctx.offering);
  const hasPdf = ctx.type === 'free' ? !!ctx.download : !!o?.formatsArr.includes('PDF');
  const list = [
    `${n} kinusaiga pattern`,
    `kinusaiga ${n} pattern`,
    `${n} kinusaiga template`,
    `kinusaiga ${n} template`,
    `${n} kinusaiga art`,
    `${n} fabric art pattern`,
    `printable ${n} pattern`,
    'kinusaiga pattern',
    'kinusaiga patterns',
    'kinusaiga template',
    'kinusaiga templates',
    'kinusaiga pattern template',
    'kinusaiga pattern printable',
    'printable kinusaiga patterns',
    'kinusaiga patterns download',
    'kinusaiga pattern download',
    'kinusaiga art',
    'kinusaiga art patterns',
    'japanese fabric art',
    'beginner kinusaiga pattern',
    'kinusaiga patterns for beginners',
  ];
  if (hasPdf) list.push('kinusaiga pattern pdf', `kinusaiga ${n} pattern pdf`);
  if (ctx.type === 'free') {
    list.push(`free ${n} kinusaiga pattern`, 'free kinusaiga pattern', `free printable ${n} pattern`);
    if (hasPdf) list.push('free kinusaiga pdf pattern');
  }
  return [...new Set(list.map((k) => k.toLowerCase()))];
}

/** Visible tags, based on the owner's original tag list (only verified ones). */
export function generateTags(ctx: TextContext): string[] {
  const n = proseNiche(ctx.niche).toLowerCase();
  const o = offeringFacts(ctx.offering);
  const tags = ['kinusaiga pattern', 'printable', n, 'kinusaiga patterns', 'digital download', 'kinusaiga template', `${n} kinusaiga`, `kinusaiga ${n}`, 'japanese fabric art'];
  if (ctx.type === 'free') tags.unshift('free kinusaiga pattern');
  if ((ctx.type === 'free' && ctx.download) || o?.formatsArr.includes('PDF')) tags.push('pdf');
  if (o?.formatsArr.includes('PNG')) tags.push('png');
  return [...new Set(tags)];
}

export function generateDescription(ctx: TextContext): ProductDescription {
  const n = proseNiche(ctx.niche);
  const o = offeringFacts(ctx.offering);

  if (ctx.type === 'free') {
    const linkDoc = ctx.download?.kind === 'link-document';
    const intro = pick(ctx.id, [
      `This free ${n} Kinusaiga pattern is a printable fabric art template you can download at no cost. Kinusaiga is a Japanese no-sew technique in which fabric pieces are tucked into grooves cut along the lines of a design.`,
      `Start your next project with this free printable ${n} Kinusaiga pattern. In Kinusaiga, the Japanese no-sew fabric art, each section of a design is filled by tucking the edges of a fabric piece into grooves cut in a board.`,
      `Download this free ${n} Kinusaiga template and create your own ${n} fabric picture. Kinusaiga is a Japanese fabric art that needs no sewing: fabric edges are tucked into grooves cut along the pattern lines.`,
    ]);
    const included: string[] = [];
    if (linkDoc) included.push(`A PDF file containing the link to the free ${n} Kinusaiga pattern files.`);
    else included.push(`The free ${n} Kinusaiga pattern as a PDF file.`);
    if (o) {
      included.push(`The pattern in ${o.sizeText}.`, `${o.formats} format${o.formatsArr.length > 1 ? 's' : ''}.`);
      if (o.noBg) included.push('A no-background version of the design.');
    }
    const features = [
      `Free printable ${n} Kinusaiga pattern`,
      'Free Kinusaiga PDF pattern download – no purchase or account required',
      ...(o ? [`${o.count} different size options`, `${o.formats} formats`, ...(o.noBg ? ['No-background version included'] : [])] : []),
      'Suitable for printing at home or at a print shop',
      'No physical product will be shipped',
    ];
    const access = linkDoc
      ? [
          'Click "Download Free Pattern" to download the PDF file.',
          'Open the PDF in any PDF reader, such as your web browser or Adobe Acrobat Reader.',
          'Click the link inside the PDF to open the folder with the pattern files, then download the files you need.',
          'For the best experience, use a laptop or desktop computer.',
        ]
      : [
          'Click "Download Free Pattern" to download the PDF file.',
          'Open the PDF in any PDF reader, such as your web browser or Adobe Acrobat Reader.',
          'For the best experience, use a laptop or desktop computer.',
        ];
    return {
      overview: [
        intro,
        `This Kinusaiga pattern is available as a free digital download. Click "Download Free Pattern" to access the available pattern file. No purchase is required. Print the ${n} Kinusaiga template, transfer the design to your board, and use the lines as your guide for cutting grooves and tucking fabric.`,
      ],
      included,
      features,
      access,
      important: [
        `This is a free digital printable ${n} Kinusaiga pattern only. No physical item will be shipped.`,
        `Print this ${n} Kinusaiga pattern at 100% scale and use it as a guide for your Kinusaiga fabric art project.`,
      ],
      questionsIntro: 'Have a question about this free pattern? Contact us – we are happy to help with:',
      questions: ['Downloading your files', 'Technical issues with the digital files', 'Opening or printing the files', 'Understanding the file formats'],
      closing: 'Explore more printable Kinusaiga patterns in our shop, including our other free Kinusaiga patterns.',
    };
  }

  const intro = pick(ctx.id, [
    `This ${n} Kinusaiga pattern is a printable fabric art template for creating a ${n} picture with Kinusaiga, the Japanese no-sew technique of tucking fabric pieces into grooves cut in a board.`,
    `Bring a ${n} design to life with this printable Kinusaiga ${n} template. Kinusaiga is a Japanese fabric art in which fabric pieces are tucked into grooves cut into a board, so no sewing is needed.`,
    `This printable ${n} Kinusaiga template gives you a ready-made design for a ${n} fabric art project. In Kinusaiga, the Japanese no-sew technique, each section of the design is filled by tucking fabric edges into grooves cut along the pattern lines.`,
  ]);
  const included = o
    ? [
        `Access to the ${n} Kinusaiga pattern files after purchase.`,
        `The pattern in ${o.sizeText}.`,
        `${o.formats} format${o.formatsArr.length > 1 ? 's' : ''}.`,
        ...(o.noBg ? ['A no-background version of the design.'] : []),
      ]
    : [`Digital ${n} Kinusaiga pattern files, available to download after purchase.`];
  const features = [
    `High-quality ${n} Kinusaiga pattern design`,
    ...(o ? [`${o.count} different size options`, ...(o.noBg ? ['No-background version included'] : []), `${n} Kinusaiga ${o.formats} formats`] : []),
    'Suitable for printing at home or at a print shop',
    'Instant digital download after successful payment',
    ...(ctx.lifetimeAccess ? ['Lifetime access to your purchased files'] : []),
    'No physical product will be shipped',
  ];
  return {
    overview: [
      intro,
      `Use the printed ${n} Kinusaiga pattern as your guide: transfer the lines to your board, cut grooves along them, and fill each section with your chosen fabrics.${o ? ` The files come in ${o.formats}, so you can print the size that suits your project.` : ''}`,
    ],
    included,
    features,
    access: [
      'Click "Buy Now" to open the secure Whop checkout.',
      'Complete your payment with one of the payment methods offered at checkout.',
      'After successful payment, Whop shows your download link and emails it to the address you entered at checkout.',
      'For the best experience, download your files on a laptop or desktop computer.',
    ],
    important: [
      `This listing is for a digital printable ${n} Kinusaiga pattern only. No physical item will be shipped.`,
      o
        ? `Choose one of the included sizes, print it at 100% scale, and use the ${n} Kinusaiga template as a guide for your fabric art project.`
        : `Print this ${n} Kinusaiga template at 100% scale and use it as a guide for your Kinusaiga fabric art project.`,
    ],
    questionsIntro: 'Have a question before or after your purchase? Contact us – we are happy to help with:',
    questions: ['Downloading your files', 'Technical issues with your digital files', 'Opening or printing the files', 'Understanding the included formats'],
    closing: 'Explore more printable Kinusaiga patterns in our shop, including free Kinusaiga patterns you can download right away.',
  };
}

export function generateFaq(ctx: TextContext): ProductFaq[] {
  const n = proseNiche(ctx.niche);
  const o = offeringFacts(ctx.offering);
  const faq: ProductFaq[] = [
    { q: 'Is this a physical product?', a: `No. This is a digital ${n} Kinusaiga pattern. Nothing is shipped – you download and print the pattern yourself. Fabric, foam board and tools are not included.` },
  ];
  if (ctx.type === 'free') {
    faq.push(
      { q: 'Do I need to pay or create an account?', a: 'No. This pattern is free. Click "Download Free Pattern" to get the file – no checkout or account is needed.' },
      { q: 'What does the download contain?', a: ctx.download?.kind === 'link-document' ? 'The download is a PDF file. Open it and click the link inside to reach the folder with the pattern files.' : 'The download is a PDF file containing the pattern.' },
    );
  } else {
    faq.push(
      { q: 'How do I receive my files?', a: 'Checkout is handled by Whop. After successful payment, Whop shows your download link and emails it to you.' },
      { q: 'Which payment methods can I use?', a: 'The available payment methods are shown on the Whop checkout page before you pay.' },
    );
  }
  faq.push({
    q: 'What size should I print?',
    a: o
      ? `Choose one of the ${o.count} included size options and print it at 100% ("actual size") so the design keeps its intended dimensions.`
      : 'Print at 100% ("actual size") so the pattern keeps its intended dimensions. Our printing guide explains how to avoid unwanted scaling.',
  });
  return faq;
}

export function inputsHash(parts: unknown): string {
  return crypto.createHash('sha1').update(JSON.stringify(parts)).digest('hex').slice(0, 16);
}
