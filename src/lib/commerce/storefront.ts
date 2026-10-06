// Shopify Storefront API client: products, variants, cart, checkout hand-over.
// Framework-free and dependency-free so it can be unit-tested with a stand-in fetch.
import { CommerceError, type Cart, type CommerceConfig, type Product } from './types.ts';

type Fetch = typeof fetch;
type Raw = Record<string, any>;

const CART_FIELDS = /* GraphQL */ `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost { subtotalAmount { amount currencyCode } }
    lines(first: 50) {
      nodes {
        id
        quantity
        cost { totalAmount { amount currencyCode } }
        merchandise {
          ... on ProductVariant {
            id
            title
            product { title handle }
          }
        }
      }
    }
  }
`;

const QUERIES = {
  product: /* GraphQL */ `
    query Product($handle: String!) {
      product(handle: $handle) {
        id
        handle
        title
        availableForSale
        variants(first: 50) {
          nodes {
            id
            title
            availableForSale
            price { amount currencyCode }
            selectedOptions { name value }
          }
        }
      }
    }
  `,
  cart: /* GraphQL */ `
    query Cart($id: ID!) { cart(id: $id) { ...CartFields } }
    ${CART_FIELDS}
  `,
  cartCreate: /* GraphQL */ `
    mutation CartCreate($lines: [CartLineInput!]) {
      cartCreate(input: { lines: $lines }) { cart { ...CartFields } userErrors { message } }
    }
    ${CART_FIELDS}
  `,
  cartLinesAdd: /* GraphQL */ `
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ...CartFields } userErrors { message } }
    }
    ${CART_FIELDS}
  `,
  cartLinesUpdate: /* GraphQL */ `
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ...CartFields } userErrors { message } }
    }
    ${CART_FIELDS}
  `,
  cartLinesRemove: /* GraphQL */ `
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ...CartFields } userErrors { message } }
    }
    ${CART_FIELDS}
  `,
};

function toCart(raw: Raw | null | undefined): Cart | null {
  if (!raw) return null;
  return {
    id: raw.id,
    checkoutUrl: raw.checkoutUrl,
    totalQuantity: raw.totalQuantity,
    subtotal: raw.cost.subtotalAmount,
    lines: raw.lines.nodes.map((line: Raw) => ({
      id: line.id,
      quantity: line.quantity,
      variantId: line.merchandise.id,
      variantTitle: line.merchandise.title,
      productTitle: line.merchandise.product.title,
      productHandle: line.merchandise.product.handle,
      total: line.cost.totalAmount,
    })),
  };
}

export function createStorefront(config: CommerceConfig, fetchImpl: Fetch = fetch) {
  if (!/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/i.test(config.domain)) {
    throw new CommerceError('Invalid store domain', 'user');
  }
  const endpoint = `https://${config.domain}/api/${config.apiVersion}/graphql.json`;

  async function request(query: string, variables: Raw): Promise<Raw> {
    let response: Response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          'x-shopify-storefront-access-token': config.token,
        },
        body: JSON.stringify({ query, variables }),
      });
    } catch {
      throw new CommerceError('Storefront not reachable', 'network');
    }
    if (!response.ok) throw new CommerceError(`Storefront answered ${response.status}`, 'http');
    const payload = (await response.json()) as { data?: Raw; errors?: { message: string }[] };
    if (payload.errors?.length) throw new CommerceError(payload.errors[0].message, 'graphql');
    return payload.data ?? {};
  }

  /** Mutations report business errors (sold out, invalid quantity) as userErrors, not as HTTP errors. */
  async function mutate(name: keyof typeof QUERIES, variables: Raw): Promise<Cart> {
    const data = await request(QUERIES[name], variables);
    const result = data[name];
    if (result?.userErrors?.length) throw new CommerceError(result.userErrors[0].message, 'user');
    const cart = toCart(result?.cart);
    if (!cart) throw new CommerceError('Cart missing in response', 'graphql');
    return cart;
  }

  return {
    async product(handle: string): Promise<Product | null> {
      const data = await request(QUERIES.product, { handle });
      const p = data.product;
      if (!p) return null;
      return {
        id: p.id,
        handle: p.handle,
        title: p.title,
        availableForSale: p.availableForSale,
        variants: p.variants.nodes.map((v: Raw) => ({
          id: v.id,
          title: v.title,
          availableForSale: v.availableForSale,
          price: v.price,
          options: v.selectedOptions,
        })),
      };
    },
    /** null when the cart no longer exists (completed or expired). */
    async cart(id: string): Promise<Cart | null> {
      const data = await request(QUERIES.cart, { id });
      return toCart(data.cart);
    },
    cartCreate: (lines: { merchandiseId: string; quantity: number }[]) => mutate('cartCreate', { lines }),
    cartLinesAdd: (cartId: string, lines: { merchandiseId: string; quantity: number }[]) => mutate('cartLinesAdd', { cartId, lines }),
    cartLinesUpdate: (cartId: string, lines: { id: string; quantity: number }[]) => mutate('cartLinesUpdate', { cartId, lines }),
    cartLinesRemove: (cartId: string, lineIds: string[]) => mutate('cartLinesRemove', { cartId, lineIds }),
  };
}

export type Storefront = ReturnType<typeof createStorefront>;
