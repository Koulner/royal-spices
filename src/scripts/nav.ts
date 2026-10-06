// Header state and compact menu. Functional motion only.

const header = document.querySelector<HTMLElement>('[data-header]');
const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const menu = document.querySelector<HTMLElement>('[data-menu]');
const label = document.querySelector<HTMLElement>('[data-menu-label]');
const main = document.querySelector<HTMLElement>('main');
const footer = document.querySelector<HTMLElement>('.site-footer');
// A hero that carries the header visually (the journey stage) keeps the bar clear while it is on screen.
const clearZone = document.querySelector<HTMLElement>('[data-header-clear]');
const compact = matchMedia('(max-width: 63.99rem)');

// Scroll position from which the bar is solid: a little before the hero has left, so nothing of it
// slides underneath clear type. Measured when the layout changes, not per frame: reading geometry
// in the frame callback would force a layout right after other scripts have written styles.
let solidFrom = 8;
function measure() {
  if (header && clearZone) solidFrom = clearZone.getBoundingClientRect().bottom + window.scrollY - header.offsetHeight * 2.4;
}

function updateHeader(y = window.scrollY) {
  header?.classList.toggle('is-solid', clearZone ? y >= solidFrom : y > 8);
}

let ticking = false;
let latestY = 0;
addEventListener(
  'scroll',
  () => {
    latestY = window.scrollY;
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateHeader(latestY);
    });
  },
  { passive: true },
);
const remeasure = () => {
  measure();
  updateHeader();
};
addEventListener('resize', remeasure, { passive: true });
// the hero's height settles with its content (fonts, pictures): keep the threshold in step
if (clearZone && 'ResizeObserver' in window) new ResizeObserver(remeasure).observe(clearZone);
remeasure();

function setOpen(open: boolean) {
  if (!toggle || !menu) return;
  toggle.setAttribute('aria-expanded', String(open));
  menu.classList.toggle('is-open', open);
  if (label) label.textContent = open ? 'Schließen' : 'Menü';
  // While the menu covers the page, the page behind it is out of reach for keyboard and screen reader.
  main?.toggleAttribute('inert', open);
  footer?.toggleAttribute('inert', open);
  document.documentElement.style.overflow = open ? 'hidden' : '';
  if (open) header?.classList.add('is-solid');
  else updateHeader();
}

function syncMenuReachability() {
  if (!menu || !toggle) return;
  const open = toggle.getAttribute('aria-expanded') === 'true';
  // In the compact layout a closed menu must not be reachable; on wide screens it is the nav bar.
  menu.toggleAttribute('inert', compact.matches && !open);
  if (!compact.matches && open) setOpen(false);
}

toggle?.addEventListener('click', () => {
  setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  syncMenuReachability();
});

menu?.addEventListener('click', (event) => {
  if ((event.target as HTMLElement).closest('a')) {
    setOpen(false);
    syncMenuReachability();
  }
});

addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
    setOpen(false);
    syncMenuReachability();
    toggle.focus();
  }
});

compact.addEventListener('change', syncMenuReachability);
syncMenuReachability();
