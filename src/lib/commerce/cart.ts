// Cart state for the Royal Spices cart experience.
// Holds no prices or stock of its own: every change goes to Shopify and the answer replaces the state.
// The only thing remembered on the device is the cart id.
import type { Cart } from './types.ts';
import type { Storefront } from './storefront.ts';

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Listener = (cart: Cart | null) => void;

const KEY = 'royalspices.cart';
const MAX_QUANTITY = 99;

export function createCart(storefront: Storefront, storage: Storage) {
  let cart: Cart | null = null;
  const listeners = new Set<Listener>();

  function set(next: Cart | null) {
    cart = next;
    try {
      if (next) storage.setItem(KEY, next.id);
      else storage.removeItem(KEY);
    } catch {
      // private mode / storage disabled: the cart still works for this page view
    }
    for (const listener of listeners) listener(cart);
    return cart;
  }

  const clamp = (quantity: number) => Math.min(MAX_QUANTITY, Math.max(1, Math.floor(quantity) || 1));

  return {
    get current() {
      return cart;
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** Restores the cart saved on this device, if Shopify still knows it. */
    async restore() {
      let id: string | null = null;
      try {
        id = storage.getItem(KEY);
      } catch {
        id = null;
      }
      if (!id) return set(null);
      return set(await storefront.cart(id));
    },
    async add(variantId: string, quantity = 1) {
      const lines = [{ merchandiseId: variantId, quantity: clamp(quantity) }];
      return set(cart ? await storefront.cartLinesAdd(cart.id, lines) : await storefront.cartCreate(lines));
    },
    async setQuantity(lineId: string, quantity: number) {
      if (!cart) return null;
      if (quantity < 1) return set(await storefront.cartLinesRemove(cart.id, [lineId]));
      return set(await storefront.cartLinesUpdate(cart.id, [{ id: lineId, quantity: clamp(quantity) }]));
    },
    async remove(lineId: string) {
      if (!cart) return null;
      return set(await storefront.cartLinesRemove(cart.id, [lineId]));
    },
  };
}

export type CartStore = ReturnType<typeof createCart>;

export function formatMoney(money: { amount: string; currencyCode: string }, locale = 'de-DE') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: money.currencyCode }).format(Number(money.amount));
}
