// Commerce types as the frontend uses them. Shopify is the source of truth for every value here;
// nothing of this shape is stored in the repository.

export type Money = { amount: string; currencyCode: string };

export type Variant = {
  id: string;
  title: string;
  availableForSale: boolean;
  price: Money;
  /** Shopify "selectedOptions", e.g. [{ name: "Gebinde", value: "1 g" }] */
  options: { name: string; value: string }[];
};

export type Product = {
  id: string;
  handle: string;
  title: string;
  availableForSale: boolean;
  variants: Variant[];
};

export type CartLine = {
  id: string;
  quantity: number;
  variantId: string;
  variantTitle: string;
  productTitle: string;
  productHandle: string;
  total: Money;
};

export type Cart = {
  id: string;
  /** Hand-over point: payment and order handling happen in Shopify Checkout, not here. */
  checkoutUrl: string;
  totalQuantity: number;
  subtotal: Money;
  lines: CartLine[];
};

export type CommerceConfig = {
  /** e.g. "royal-spices.myshopify.com" — host only, no protocol */
  domain: string;
  /** Storefront API public access token. Public by design; the Admin API token never belongs in the browser. */
  token: string;
  apiVersion: string;
};

export type CommerceErrorKind = 'network' | 'http' | 'graphql' | 'user';

export class CommerceError extends Error {
  kind: CommerceErrorKind;

  constructor(message: string, kind: CommerceErrorKind) {
    super(message);
    this.name = 'CommerceError';
    this.kind = kind;
  }
}
