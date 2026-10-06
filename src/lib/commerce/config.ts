// Whether commerce is switched on is decided at build time by two public variables.
// Without them the site builds without any cart code and product pages lead to the inquiry.
import { PUBLIC_SHOPIFY_STORE_DOMAIN, PUBLIC_SHOPIFY_STOREFRONT_TOKEN, PUBLIC_SHOPIFY_API_VERSION } from 'astro:env/client';
import type { CommerceConfig } from './types.ts';

export const commerceEnabled = Boolean(PUBLIC_SHOPIFY_STORE_DOMAIN && PUBLIC_SHOPIFY_STOREFRONT_TOKEN);

export const commerceConfig: CommerceConfig = {
  domain: PUBLIC_SHOPIFY_STORE_DOMAIN ?? '',
  token: PUBLIC_SHOPIFY_STOREFRONT_TOKEN ?? '',
  // Shopify releases quarterly versions; pin deliberately and review before each update.
  apiVersion: PUBLIC_SHOPIFY_API_VERSION ?? '2026-07',
};
