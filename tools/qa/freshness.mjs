// B1a: are the built pages still what Shopify says? Prices and stock come into the HTML at build time
// (catalog.ts); only the product page refreshes them in the browser, its JSON-LD Offer never does.
//   node tools/qa/freshness.mjs [dist/client] [--fixture <storefront answer.json>]
// Per product of the Storefront API, compared with the build:
//   /                    card price and unit price (only products that have a card there)
//   /produkte/           price, unit price, "Ausverkauft"
//   /produkte/<handle>/  buy box price, unit price, data-available, "Ausverkauft", JSON-LD Offer price and availability
// plus a product without a page and a page without a product. Store values: PUBLIC_SHOPIFY_* from
// .env or the process environment (wins), like astro.config.mjs; API version as in config.ts.
// --fixture answers the product query from a recorded answer instead of asking Shopify.
// Reads the build only, the site makes no request. Exit 1 on any deviation, 2 on a usage or API error.
// Needs Node with type stripping (22.18+, or --experimental-strip-types): it uses the site's own code.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';
import { createStorefront } from '../../src/lib/commerce/storefront.ts';
import { formatMoney } from '../../src/lib/commerce/cart.ts';
import { unitPriceLabel } from '../../src/lib/commerce/unit-price.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const IN_STOCK = 'https://schema.org/InStock';

const decode = (s) =>
  s
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
// Collapses markup whitespace only: the no-break space inside "12,90 €" (formatMoney) stays.
const textOf = (html) => decode(html.replace(/<[^>]*>/g, ' ')).replace(/[ \t\r\n]+/g, ' ').replace(/^ | $/g, '');
const UNIT_LINE = /<p class="small[^"]*"[^>]*>(Grundpreis [^<]*)<\/p>/;

/** The markup segment of one product: from its opening tag (e.g. `<li class="card`) to the next one. */
function segment(html, opener, handle) {
  const href = `href="/produkte/${handle}/"`;
  return html.split(opener).slice(1).find((part) => part.includes(href)) ?? null;
}

/** What the start page says about a product, null when it has no card there. */
export function homeFacts(html, handle) {
  const part = segment(html, '<li class="card', handle); // also the gift card (class="card card--gift")
  if (!part) return null;
  return {
    price: decode(/class="card__amount"[^>]*>([^<]*)</.exec(part)?.[1] ?? '').trim() || null,
    unit: decode(UNIT_LINE.exec(part)?.[1] ?? '') || null,
  };
}

/** What /produkte/ says about a product, null when it is not listed. */
export function listFacts(html, handle) {
  const part = segment(html, '<article class="pcard"', handle);
  if (!part) return null;
  const price = /<p class="pcard__price"[^>]*>([\s\S]*?)<\/p>/.exec(part)?.[1];
  return {
    price: price ? textOf(price.replace(/<span class="sr-only"[^>]*>[^<]*<\/span>/, '')) || null : null,
    unit: decode(UNIT_LINE.exec(part)?.[1] ?? '') || null,
    soldOut: /<p class="small"[^>]*>Ausverkauft<\/p>/.test(part),
  };
}

/** What a product page says: buy box and the Offer of its Product JSON-LD. */
export function productFacts(html) {
  const box = /<div class="buybox__body"([^>]*)>([\s\S]*?)<p class="buybox__feedback"/.exec(html);
  const offers = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .flatMap((m) => {
      try {
        return [JSON.parse(m[1])].flat();
      } catch {
        return [];
      }
    })
    .flatMap((node) => (node?.['@graph'] ? node['@graph'] : [node]))
    .filter((node) => node?.['@type'] === 'Product')
    .flatMap((p) => [p.offers].flat().filter(Boolean));
  const offer = offers[0] ?? null;
  return {
    hasBox: Boolean(box),
    handle: box ? (/data-handle="([^"]*)"/.exec(box[1])?.[1] ?? null) : null,
    price: box ? decode(/data-buybox-price[^>]*>([^<]*)</.exec(box[2])?.[1] ?? '').trim() || null : null,
    unit: box ? decode(/data-buybox-unit[^>]*>([^<]*)</.exec(box[2])?.[1] ?? '') || null : null,
    available: box ? /data-available="true"/.test(box[1]) : null,
    soldOutShown: box ? /<p class="small buybox__soldout"[^>]*data-buybox-soldout(?![^>]*\bhidden\b)[^>]*>/.test(box[2]) : null,
    offerPrice: offer ? Number(offer.price) : null,
    offerAvailable: offer ? offer.availability === IN_STOCK : null,
  };
}

/**
 * Deviations between the build in `dist` and `products` (storefront.products()).
 * Each finding: { page, handle, field, built, shopify }.
 */
export async function checkFreshness(dist, products) {
  const findings = [];
  const add = (page, handle, field, built, shopify) => findings.push({ page, handle, field, built, shopify });
  const read = (path) => readFile(join(dist, path), 'utf8').catch(() => null);
  const home = await read('index.html');
  const list = await read('produkte/index.html');
  if (home === null || list === null) throw new Error(`Kein Build in ${dist} (index.html oder produkte/index.html fehlt)`);

  for (const p of products) {
    const v = p.firstVariant;
    const price = v ? formatMoney(v.price) : null;
    const unit = v?.unitPrice ? unitPriceLabel(v.unitPrice) : null;
    const available = v ? v.availableForSale : false;

    const h = homeFacts(home, p.handle);
    if (h) {
      if (h.price !== price) add('/', p.handle, 'Preis', h.price, price);
      if (h.unit !== unit) add('/', p.handle, 'Grundpreis', h.unit, unit);
    }

    const l = listFacts(list, p.handle);
    if (!l) add('/produkte/', p.handle, 'Eintrag', 'fehlt', 'im Shop');
    else {
      if (l.price !== price) add('/produkte/', p.handle, 'Preis', l.price, price);
      if (l.unit !== unit) add('/produkte/', p.handle, 'Grundpreis', l.unit, unit);
      if (l.soldOut === available) add('/produkte/', p.handle, 'Ausverkauft', l.soldOut ? 'ja' : 'nein', available ? 'nein' : 'ja');
    }

    const path = `/produkte/${p.handle}/`;
    const page = await read(`produkte/${p.handle}/index.html`);
    if (page === null) {
      add(path, p.handle, 'Seite', 'fehlt', 'im Shop');
      continue;
    }
    const f = productFacts(page);
    if (!f.hasBox || f.handle !== p.handle) {
      add(path, p.handle, 'Kaufmodul', 'fehlt', 'Preis aus Shopify');
      continue;
    }
    if (f.price !== price) add(path, p.handle, 'Preis', f.price, price);
    if (f.unit !== unit) add(path, p.handle, 'Grundpreis', f.unit, unit);
    if (f.available !== available) add(path, p.handle, 'verfügbar', String(f.available), String(available));
    if (f.soldOutShown === available) add(path, p.handle, 'Ausverkauft', f.soldOutShown ? 'ja' : 'nein', available ? 'nein' : 'ja');
    const amount = v ? Number(v.price.amount) : null;
    if (f.offerPrice === null) {
      if (amount) add(path, p.handle, 'Offer', 'fehlt', v.price.amount);
    } else {
      if (amount === null || Math.abs(f.offerPrice - amount) > 0.005) add(path, p.handle, 'Offer.price', f.offerPrice.toFixed(2), amount?.toFixed(2) ?? 'keiner');
      if (f.offerAvailable !== available) add(path, p.handle, 'Offer.availability', f.offerAvailable ? 'InStock' : 'OutOfStock', available ? 'InStock' : 'OutOfStock');
    }
  }

  // Pages of products that are no longer in the shop.
  const known = new Set(products.map((p) => p.handle));
  const dirs = await readdir(join(dist, 'produkte'), { withFileTypes: true }).catch(() => []);
  for (const d of dirs) {
    if (d.isDirectory() && !known.has(d.name) && (await read(`produkte/${d.name}/index.html`)) !== null) {
      add(`/produkte/${d.name}/`, d.name, 'Produkt', 'Seite gebaut', 'nicht mehr im Shop');
    }
  }
  return findings;
}

/** Store values like astro.config.mjs reads them; the API version falls back to the one in config.ts. */
async function storeConfig() {
  const env = loadEnv('production', ROOT, '');
  const domain = env.PUBLIC_SHOPIFY_STORE_DOMAIN;
  const token = env.PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
  if (!domain || !token) throw new Error('PUBLIC_SHOPIFY_STORE_DOMAIN und PUBLIC_SHOPIFY_STOREFRONT_TOKEN fehlen (.env oder Umgebung)');
  const source = await readFile(join(ROOT, 'src/lib/commerce/config.ts'), 'utf8');
  const fallback = /PUBLIC_SHOPIFY_API_VERSION\s*\?\?\s*'([^']+)'/.exec(source)?.[1];
  const apiVersion = env.PUBLIC_SHOPIFY_API_VERSION || fallback;
  if (!apiVersion) throw new Error('API-Version weder gesetzt noch in src/lib/commerce/config.ts gefunden');
  return { domain, token, apiVersion };
}

export async function main(argv) {
  const fixtureAt = argv.indexOf('--fixture');
  const fixture = fixtureAt >= 0 ? argv[fixtureAt + 1] : null;
  if (fixtureAt >= 0 && !fixture) throw new Error('Aufruf: node tools/qa/freshness.mjs [dist/client] [--fixture <datei.json>]');
  const dist = argv.find((a, i) => !a.startsWith('--') && i !== fixtureAt + 1) ?? 'dist/client';
  let config;
  let fetchImpl = fetch;
  if (fixture) {
    const answer = await readFile(fixture, 'utf8');
    config = { domain: 'fixture.myshopify.com', token: 'fixture', apiVersion: 'fixture' };
    fetchImpl = async () => new Response(JSON.stringify({ data: JSON.parse(answer).data }), { status: 200 });
  } else {
    config = await storeConfig();
  }
  const products = await createStorefront(config, fetchImpl).products();
  return { findings: await checkFreshness(dist, products), products, dist };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const { findings, products, dist } = await main(process.argv.slice(2));
    for (const f of findings) {
      const where = f.page.includes(f.handle) ? f.page : `${f.page} [${f.handle}]`;
      console.log(`${where.padEnd(48)} ${f.field}: gebaut ${f.built ?? '–'}, Shopify ${f.shopify ?? '–'}`);
    }
    console.log(findings.length ? `\n${findings.length} Abweichung(en) bei ${products.length} Produkten in ${dist}: neu bauen.` : `\nkeine Abweichungen (${products.length} Produkte, ${dist})`);
    process.exitCode = findings.length ? 1 : 0;
  } catch (error) {
    console.error(`freshness.mjs: ${error.message}`);
    process.exitCode = 2;
  }
}
