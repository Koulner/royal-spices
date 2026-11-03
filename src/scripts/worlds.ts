// Der rote Faden (Redesign T-20261103-03, aus infusion.ts): Farbwelt der Kopfzeile und Aufdecken des Fadens.
// Die Welt läuft ohne Scroll-Ereignis über einen IntersectionObserver. Der Faden schreibt nur --r, wie journey.ts.
// Ohne Bewegung (prefers-reduced-motion) steht er ganz da, das CSS verlangt dann kein --r.

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const header = document.querySelector<HTMLElement>('[data-header]');
const worlds = [...document.querySelectorAll<HTMLElement>('[data-world]:not([data-header])')];
const zones = [...document.querySelectorAll<SVGElement>('[data-zone]')].map((el) => ({ el, top: 0, h: 1 }));
const under = new Set<Element>();

export function paintWorld() {
  if (!header) return;
  const world = worlds.filter((w) => under.has(w)).pop()?.dataset.world;
  if (world) header.dataset.world = world;
  else delete header.dataset.world;
}

// Der Streifen hinter der Kopfzeile: oberste 8 % des Fensters. Die letzte Welt darin gewinnt.
const watcher = new IntersectionObserver(
  (entries) => {
    for (const e of entries) under[e.isIntersecting ? 'add' : 'delete'](e.target);
    paintWorld();
  },
  { rootMargin: '0px 0px -92% 0px' },
);
for (const w of worlds) watcher.observe(w);

if (zones.length && matchMedia('(prefers-reduced-motion: no-preference)').matches) {
  let vh = 0;
  let queued = false;

  const draw = () => {
    queued = false;
    const tip = scrollY + vh * 0.72; // die Fadenspitze läuft auf 72 % der Fensterhöhe mit
    for (const z of zones) z.el.style.setProperty('--r', clamp((tip - z.top) / z.h).toFixed(4));
  };

  // Die Geometrie wird nur gemessen, wenn sich das Layout ändert, nie im Bild.
  const measure = () => {
    vh = innerHeight;
    for (const z of zones) {
      const r = z.el.getBoundingClientRect();
      z.top = r.top + scrollY;
      z.h = r.height;
    }
    draw();
  };

  addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(draw);
    },
    { passive: true },
  );
  addEventListener('resize', measure, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);
  measure();
}
