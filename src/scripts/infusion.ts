// Der rote Faden (Redesign T-20261103-02): liest das native Scrollen und schreibt nur CSS-Variablen,
// wie journey.ts. Kopfzeile und Faden laufen über worlds.ts, die Bühne meldet ihre Welt über data-world.
// Ohne Bewegung (prefers-reduced-motion) bleibt der gefärbte Endzustand aus dem CSS stehen.

import { paintWorld } from './worlds';

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const moving = matchMedia('(prefers-reduced-motion: no-preference)').matches;
const stage = document.querySelector<HTMLElement>('[data-infusion]');
const pin = stage?.querySelector<HTMLElement>('[data-infusion-pin]');
const vitrine = document.querySelector<HTMLElement>('[data-vitrine]');
let gold = !moving;

function stageWorld() {
  if (stage) stage.dataset.world = gold ? 'gold' : 'nacht';
  paintWorld();
}
stageWorld();

if (moving) {
  let vh = 0;
  let stageTop = 0;
  let stageRun = 1;
  let vitrineTop = 0;
  let queued = false;

  const box = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { top: r.top + scrollY, h: r.height };
  };

  const draw = () => {
    queued = false;
    const y = scrollY;
    vitrine?.style.setProperty('--lit', clamp((y + vh - vitrineTop - vh * 0.1) / (vh * 0.55)).toFixed(3));
    if (!stage) return;
    const p = clamp((y - stageTop) / stageRun);
    stage.style.setProperty('--p', p.toFixed(4));
    const isGold = p > 0.7;
    if (isGold !== gold) {
      gold = isGold;
      stage.classList.toggle('is-gold', gold);
      stageWorld();
    }
  };

  // Die Geometrie wird nur gemessen, wenn sich das Layout ändert, nie im Bild.
  const measure = () => {
    vh = innerHeight;
    if (stage && pin) {
      const s = box(stage);
      stageTop = s.top;
      stageRun = Math.max(1, s.h - pin.offsetHeight);
    }
    if (vitrine) vitrineTop = box(vitrine).top;
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
  const home = document.querySelector('.home');
  if (home && 'ResizeObserver' in window) new ResizeObserver(measure).observe(home);
  measure();
}
