// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';

// No usage data leaves the machine from this project's tooling.
process.env.ASTRO_TELEMETRY_DISABLED = '1';

// This file runs before Astro loads .env, so process.env alone misses the values set there
// (the Shopify domain would reach astro:env but not the CSP below). loadEnv reads .env and
// .env.<mode> plus the process environment (which wins), as astro:env does. Astro sets NODE_ENV
// to the mode (build: production, dev: development) before loading this file.
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

const FONTSOURCE = './node_modules/@fontsource';

// Shopify is optional until the store exists. When the public env vars are set, the
// Storefront API host is added to connect-src; otherwise the policy stays same-origin only.
const shopDomain = env.PUBLIC_SHOPIFY_STORE_DOMAIN;

export default defineConfig({
  // Read from the process environment only: tools/qa/seo.mjs and tools/seo/indexnow.mjs parse this line.
  site: process.env.SITE_URL ?? 'https://royalspices.de',
  trailingSlash: 'always',
  // Pages are prerendered HTML. Only the inquiry endpoint runs on the server.
  output: 'static',
  adapter: node({ mode: 'middleware' }),
  // Classic whitespace handling: inline elements keep the spaces authors wrote.
  compressHTML: true,
  // No code blocks on this site; Shiki's inline styles would also conflict with the CSP.
  markdown: { syntaxHighlight: false },
  integrations: [
    sitemap({
      filter: (page) => !/\/(anfrage|404)\//.test(page),
    }),
  ],
  security: {
    checkOrigin: true,
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self' data: blob:" + (shopDomain ? ' https://cdn.shopify.com' : ''),
        "font-src 'self'",
        "connect-src 'self'" + (shopDomain ? ` https://${shopDomain}` : ''),
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "worker-src 'self' blob:",
      ],
    },
  },
  env: {
    schema: {
      // Commerce: public by design (Storefront API tokens are meant for browsers).
      PUBLIC_SHOPIFY_STORE_DOMAIN: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_SHOPIFY_STOREFRONT_TOKEN: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_SHOPIFY_API_VERSION: envField.string({ context: 'client', access: 'public', optional: true }),
      // Inquiry delivery: server only, never bundled for the browser.
      SMTP_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      INQUIRY_TO: envField.string({ context: 'server', access: 'secret', optional: true }),
      INQUIRY_FROM: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Cormorant Garamond',
      cssVariable: '--font-display',
      fallbacks: ['Georgia', 'Times New Roman', 'serif'],
      options: {
        variants: [
          { src: [`${FONTSOURCE}/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2`], weight: 500, style: 'normal' },
          { src: [`${FONTSOURCE}/cormorant-garamond/files/cormorant-garamond-latin-500-italic.woff2`], weight: 500, style: 'italic' },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Manrope',
      cssVariable: '--font-text',
      fallbacks: ['system-ui', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
      options: {
        variants: [
          { src: [`${FONTSOURCE}-variable/manrope/files/manrope-latin-wght-normal.woff2`], weight: '400 700', style: 'normal' },
        ],
      },
    },
  ],
  build: {
    inlineStylesheets: 'auto',
  },
  devToolbar: { enabled: false },
  server: { host: '127.0.0.1', port: 4321 },
});
