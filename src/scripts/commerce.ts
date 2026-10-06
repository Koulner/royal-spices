// Commerce UI: buy box on the product page and the cart panel.
// Loaded on demand and only when the site was built with a Shopify store configured.
// Everything shown here comes from the Storefront API at view time; text is set via textContent.
import { commerceConfig, commerceEnabled } from '@/lib/commerce/config';
import { createStorefront } from '@/lib/commerce/storefront';
import { createCart, formatMoney } from '@/lib/commerce/cart';
import { CommerceError, type Cart, type Product, type Variant } from '@/lib/commerce/types';
import '@/styles/commerce.css';

if (commerceEnabled) init();

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {}, children: (Node | string)[] = []) {
  const node = document.createElement(tag);
  const { class: className, ...rest } = props;
  if (className) node.className = className;
  Object.assign(node, rest);
  node.append(...children);
  return node;
}

function messageFor(error: unknown) {
  if (error instanceof CommerceError && error.kind === 'user') return error.message;
  return 'Das hat gerade nicht geklappt. Bitte versuchen Sie es noch einmal.';
}

function init() {
  const storefront = createStorefront(commerceConfig);
  const cart = createCart(storefront, localStorage);

  // ---------------------------------------------------------------- cart panel
  const dialog = el('dialog', { class: 'cart' });
  dialog.setAttribute('aria-labelledby', 'cart-title');
  const list = el('ul', { class: 'cart__lines' });
  const empty = el('p', { class: 'cart__empty' }, ['Ihr Warenkorb ist leer.']);
  const subtotal = el('p', { class: 'cart__subtotal' });
  const status = el('p', { class: 'cart__status' });
  status.setAttribute('role', 'status');
  const checkout = el('a', { class: 'btn cart__checkout' }, ['Sicher bezahlen']);
  const close = el('button', { class: 'cart__close', type: 'button' }, ['Schließen']);
  close.addEventListener('click', () => dialog.close());
  dialog.append(
    el('div', { class: 'cart__head' }, [el('h2', { class: 'display-m', id: 'cart-title' }, ['Warenkorb']), close]),
    list,
    empty,
    el('div', { class: 'cart__foot' }, [
      subtotal,
      el('p', { class: 'small' }, ['Versand und Steuern werden im Checkout berechnet. Die Bezahlung läuft über Shopify.']),
      checkout,
      status,
    ]),
  );
  // a click on the backdrop closes the panel
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  document.body.append(dialog);

  const openers = document.querySelectorAll<HTMLButtonElement>('[data-cart-open]');
  for (const opener of openers) {
    opener.hidden = false;
    opener.addEventListener('click', () => dialog.showModal());
  }

  async function run(action: () => Promise<unknown>) {
    status.textContent = '';
    dialog.classList.add('is-busy');
    try {
      await action();
    } catch (error) {
      status.textContent = messageFor(error);
    } finally {
      dialog.classList.remove('is-busy');
    }
  }

  function renderCart(current: Cart | null) {
    const count = current?.totalQuantity ?? 0;
    for (const opener of openers) {
      const badge = opener.querySelector('[data-cart-count]');
      if (badge) badge.textContent = String(count);
      opener.setAttribute('aria-label', `Warenkorb öffnen, ${count} Artikel`);
    }
    list.replaceChildren();
    const lines = current?.lines ?? [];
    empty.hidden = lines.length > 0;
    checkout.hidden = lines.length === 0;
    subtotal.textContent = current && lines.length ? `Zwischensumme ${formatMoney(current.subtotal)}` : '';
    if (current) checkout.href = current.checkoutUrl;
    for (const line of lines) {
      const quantity = el('input', { type: 'number', min: '0', max: '99', value: String(line.quantity), className: 'cart__qty' });
      quantity.setAttribute('aria-label', `Menge für ${line.productTitle}`);
      quantity.addEventListener('change', () => run(() => cart.setQuantity(line.id, Number(quantity.value))));
      const remove = el('button', { type: 'button', className: 'cart__remove' }, ['Entfernen']);
      remove.setAttribute('aria-label', `${line.productTitle} entfernen`);
      remove.addEventListener('click', () => run(() => cart.remove(line.id)));
      list.append(
        el('li', {}, [
          el('div', {}, [el('p', { class: 'cart__name' }, [line.productTitle]), el('p', { class: 'small' }, [line.variantTitle])]),
          el('div', { class: 'cart__controls' }, [quantity, remove]),
          el('p', { class: 'cart__price' }, [formatMoney(line.total)]),
        ]),
      );
    }
  }

  cart.subscribe(renderCart);
  cart.restore().catch(() => renderCart(null));

  // ---------------------------------------------------------------- buy box
  for (const box of document.querySelectorAll<HTMLElement>('[data-buybox]')) {
    const body = box.querySelector<HTMLElement>('[data-buybox-body]')!;
    const handle = box.dataset.handle!;
    storefront
      .product(handle)
      .then((product) => (product ? renderBuyBox(body, product) : renderUnavailable(body)))
      .catch(() => renderUnavailable(body));
  }

  function renderUnavailable(body: HTMLElement) {
    body.replaceChildren(el('p', {}, ['Der Kauf ist im Moment nicht möglich. Fragen Sie das Glas gern direkt bei uns an.']));
  }

  function renderBuyBox(body: HTMLElement, product: Product) {
    let selected: Variant = product.variants.find((v) => v.availableForSale) ?? product.variants[0];
    const price = el('p', { class: 'buybox__price display-m' });
    const availability = el('p', { class: 'small' });
    const feedback = el('p', { class: 'buybox__feedback' });
    feedback.setAttribute('role', 'status');
    const quantity = el('input', { type: 'number', min: '1', max: '99', value: '1', id: 'buy-qty', className: 'buybox__qty' });
    const add = el('button', { type: 'button', className: 'btn' }, ['In den Warenkorb']);

    const variants = el('fieldset', { class: 'buybox__variants' }, [el('legend', { class: 'eyebrow' }, ['Gebinde'])]);
    product.variants.forEach((variant, index) => {
      const id = `buy-variant-${index}`;
      const input = el('input', { type: 'radio', name: 'variant', id, value: variant.id, checked: variant.id === selected.id, disabled: !variant.availableForSale });
      input.addEventListener('change', () => {
        selected = variant;
        sync();
      });
      variants.append(el('div', { class: 'buybox__variant' }, [input, el('label', { htmlFor: id }, [variant.title])]));
    });
    variants.hidden = product.variants.length < 2;

    function sync() {
      price.textContent = formatMoney(selected.price);
      availability.textContent = selected.availableForSale ? 'Verfügbar. Inklusive Mehrwertsteuer, zuzüglich Versand.' : 'Derzeit nicht verfügbar.';
      add.disabled = !selected.availableForSale;
    }

    add.addEventListener('click', async () => {
      add.disabled = true;
      feedback.textContent = '';
      try {
        await cart.add(selected.id, Number(quantity.value));
        dialog.showModal();
      } catch (error) {
        feedback.textContent = messageFor(error);
      } finally {
        add.disabled = !selected.availableForSale;
      }
    });

    sync();
    body.replaceChildren(
      price,
      availability,
      variants,
      el('div', { class: 'buybox__row' }, [el('label', { htmlFor: 'buy-qty', className: 'buybox__qty-label' }, ['Menge']), quantity, add]),
      feedback,
    );
  }
}
