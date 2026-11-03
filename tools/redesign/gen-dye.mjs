// Färbemaske und Fäden für den Aufguss (T-20261103-01, -02): nur CPU, kein WebGL, keine GPU.
// Schwere Farbe sinkt von den Fäden ins Wasser (2D-Fluid mit Auftrieb), Tracer-Teilchen zeichnen
// die feinen Schlieren. Reproduzierbar. Aufruf: node tools/redesign/gen-dye.mjs [Ausgabeordner]
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const out = process.argv[2] ?? 'public/img/infusion';
mkdirSync(out, { recursive: true });

// Reproduzierbarer Zufall
let seed = 20261103;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

const NX = 340, NY = 476; // Seitenverhältnis 1 : 1,4
const STEPS = 1150, ITER = 22, DT = 1;
const IDX = (x, y) => x + y * NX;
const u = new Float32Array(NX * NY), v = new Float32Array(NX * NY), d = new Float32Array(NX * NY);
const u2 = new Float32Array(NX * NY), v2 = new Float32Array(NX * NY), d2 = new Float32Array(NX * NY);
const p = new Float32Array(NX * NY), div = new Float32Array(NX * NY), curl = new Float32Array(NX * NY);

// Die Fäden liegen an der Oberfläche; dieselben x-Werte nutzt threads.svg
const SOURCES = [0.2, 0.36, 0.5, 0.67, 0.82].map((x, i) => ({
  x,
  y: 0.012 + 0.008 * (i % 3),
  rate: 0.6 + rnd() * 0.6,
  start: (i * 53) % 150,
  phase: rnd() * 6.28,
  speed: 0.012 + rnd() * 0.02,
}));

function sample(f, x, y) {
  x = Math.max(0.5, Math.min(NX - 1.5, x));
  y = Math.max(0.5, Math.min(NY - 1.5, y));
  const i = x | 0, j = y | 0, a = x - i, b = y - j, k = i + j * NX;
  return (1 - b) * ((1 - a) * f[k] + a * f[k + 1]) + b * ((1 - a) * f[k + NX] + a * f[k + NX + 1]);
}

function advect(src, dst, damp) {
  for (let y = 1; y < NY - 1; y++)
    for (let x = 1; x < NX - 1; x++) {
      const k = IDX(x, y);
      dst[k] = sample(src, x - DT * u[k], y - DT * v[k]) * damp;
    }
}

function project() {
  for (let y = 1; y < NY - 1; y++)
    for (let x = 1; x < NX - 1; x++) {
      const k = IDX(x, y);
      div[k] = -0.5 * (u[k + 1] - u[k - 1] + v[k + NX] - v[k - NX]);
    }
  p.fill(0);
  for (let it = 0; it < ITER; it++)
    for (let y = 1; y < NY - 1; y++)
      for (let x = 1 + ((y + it) & 1); x < NX - 1; x += 2) {
        const k = IDX(x, y);
        p[k] = 0.25 * 1.7 * (div[k] + p[k - 1] + p[k + 1] + p[k - NX] + p[k + NX]) - 0.7 * p[k];
      }
  for (let y = 1; y < NY - 1; y++)
    for (let x = 1; x < NX - 1; x++) {
      const k = IDX(x, y);
      u[k] -= 0.5 * (p[k + 1] - p[k - 1]);
      v[k] -= 0.5 * (p[k + NX] - p[k - NX]);
    }
}

// Tracer
const MAXP = 3_000_000;
const px = new Float32Array(MAXP), py = new Float32Array(MAXP);
let np = 0;
const EMIT = Math.floor(MAXP / STEPS / SOURCES.length);

const t0 = Date.now();
for (let step = 0; step < STEPS; step++) {
  for (const s of SOURCES) {
    if (step < s.start) continue;
    const sx = s.x * NX + Math.sin(step * s.speed + s.phase) * 2.2;
    const sy = s.y * NY + 3;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -3; dx <= 3; dx++) {
        const k = IDX((sx + dx) | 0, (sy + dy) | 0);
        d[k] = Math.min(1.4, d[k] + 0.05 * s.rate);
      }
    for (let i = 0; i < EMIT && np < MAXP; i++, np++) {
      px[np] = sx + (rnd() - 0.5) * 4.5;
      py[np] = sy + (rnd() - 0.5) * 3;
    }
  }
  // Auftrieb nach unten plus kleine Störung
  for (let y = 1; y < NY - 1; y++)
    for (let x = 1; x < NX - 1; x++) {
      const k = IDX(x, y);
      v[k] += 0.019 * d[k];
      u[k] *= 0.998;
      v[k] *= 0.998;
    }
  for (let n = 0; n < 6; n++) {
    const k = IDX(2 + (rnd() * (NX - 4)) | 0, 2 + (rnd() * (NY - 4)) | 0);
    u[k] += (rnd() - 0.5) * 1.2;
  }
  // Wirbel erhalten
  for (let y = 1; y < NY - 1; y++)
    for (let x = 1; x < NX - 1; x++) {
      const k = IDX(x, y);
      curl[k] = 0.5 * (v[k + 1] - v[k - 1] - u[k + NX] + u[k - NX]);
    }
  for (let y = 2; y < NY - 2; y++)
    for (let x = 2; x < NX - 2; x++) {
      const k = IDX(x, y);
      const gx = 0.5 * (Math.abs(curl[k + 1]) - Math.abs(curl[k - 1]));
      const gy = 0.5 * (Math.abs(curl[k + NX]) - Math.abs(curl[k - NX]));
      const l = Math.hypot(gx, gy) + 1e-5;
      const e = 0.025;
      u[k] += (e * gy * curl[k]) / l;
      v[k] -= (e * gx * curl[k]) / l;
    }
  project();
  advect(u, u2, 0.9995);
  advect(v, v2, 0.9995);
  u.set(u2);
  v.set(v2);
  project();
  advect(d, d2, 0.9985);
  d.set(d2);
  for (let i = 0; i < np; i++) {
    const a = sample(u, px[i], py[i]);
    const b = sample(v, px[i], py[i]);
    px[i] = Math.max(1, Math.min(NX - 2, px[i] + a * DT));
    py[i] = Math.max(1, Math.min(NY - 2, py[i] + b * DT));
  }
  if (step % 100 === 0) console.log('Schritt', step, np, Math.round((Date.now() - t0) / 1000) + 's');
}

// Ausgabe: feine Schlieren
const W = 1000, H = 1400;
const buf = new Float32Array(W * H);
const sx = W / NX, sy = H / NY;
for (let i = 0; i < np; i++) {
  const x = px[i] * sx + (rnd() - 0.5) * 1.2, y = py[i] * sy + (rnd() - 0.5) * 1.2;
  const a = x | 0, b = y | 0;
  if (a < 0 || b < 0 || a >= W - 1 || b >= H - 1) continue;
  const f = x - a, g = y - b, k = a + b * W;
  buf[k] += (1 - f) * (1 - g);
  buf[k + 1] += f * (1 - g);
  buf[k + W] += (1 - f) * g;
  buf[k + W + 1] += f * g;
}
const mix = (a, b, t) => a + (b - a) * t;
const sm = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const edge = (x) => sm(x / 0.14) * sm((1 - x) / 0.06);
function ramp(t) {
  // verdünnt: helles Gold, konzentriert: Safranrot
  const stops = [
    [0, [246, 168, 58]],
    [0.45, [243, 150, 30]],
    [0.8, [226, 100, 18]],
    [1, [188, 58, 14]],
  ];
  for (let i = 1; i < stops.length; i++)
    if (t <= stops[i][0]) {
      const q = (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      return stops[i - 1][1].map((c, n) => mix(c, stops[i][1][n], q));
    }
  return stops[stops.length - 1][1];
}
const fine = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const a = 1 - Math.exp(-buf[i] * 0.1);
  const c = ramp(Math.pow(a, 2));
  fine[i * 4] = c[0];
  fine[i * 4 + 1] = c[1];
  fine[i * 4 + 2] = c[2];
  fine[i * 4 + 3] = Math.round(255 * Math.pow(a, 0.9) * edge((i % W) / W));
}
const raw = { raw: { width: W, height: H, channels: 4 } };
const fineImage = sharp(fine, raw).blur(0.8);
await fineImage.clone().avif({ quality: 50, effort: 6 }).toFile(join(out, 'dye-fine.avif'));
await fineImage.clone().webp({ quality: 60, alphaQuality: 70, effort: 6 }).toFile(join(out, 'dye-fine.webp'));

// Ausgabe: weicher Körper aus dem Dichtefeld
const SW = NX, SH = NY;
const soft = Buffer.alloc(SW * SH * 4);
for (let i = 0; i < SW * SH; i++) {
  const a = Math.min(1, d[i] * 1.6);
  const c = ramp(a * 0.55);
  soft[i * 4] = c[0];
  soft[i * 4 + 1] = c[1];
  soft[i * 4 + 2] = c[2];
  soft[i * 4 + 3] = Math.round(255 * Math.pow(a, 0.7) * 0.9 * edge((i % SW) / SW));
}
const softImage = sharp(soft, { raw: { width: SW, height: SH, channels: 4 } }).blur(2.4).resize(680, 952);
await softImage.clone().avif({ quality: 50, effort: 6 }).toFile(join(out, 'dye-soft.avif'));
await softImage.clone().webp({ quality: 60, alphaQuality: 70, effort: 6 }).toFile(join(out, 'dye-soft.webp'));

// Fäden: schmale Bänder mit Trompeten-Ende wie beim Negin-Faden (Etikett und saffron-Still)
function ribbon(x0, y0, len, ang, bend, w0, w1) {
  const n = 26, l = [], r = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = ang + bend * Math.sin(t * 3.0);
    const x = x0 + Math.cos(a) * len * t + Math.sin(t * 7) * len * 0.012;
    const y = y0 + Math.sin(a) * len * t + bend * len * 0.12 * t * t;
    const w = (w0 + (w1 - w0) * Math.pow(t, 4.2)) * (1 + 0.1 * Math.sin(t * 19));
    const nx = -Math.sin(a), ny = Math.cos(a);
    l.push(`${(x + nx * w).toFixed(1)} ${(y + ny * w).toFixed(1)}`);
    r.unshift(`${(x - nx * w).toFixed(1)} ${(y - ny * w).toFixed(1)}`);
  }
  return `M${l.join('L')}L${r.join('L')}Z`;
}
const VW = 1000, VH = 90;
let paths = '';
SOURCES.forEach((s, i) => {
  const n = 2 + (i % 2);
  for (let j = 0; j < n; j++) {
    const len = 90 + rnd() * 100;
    const ang = (rnd() < 0.5 ? 0 : Math.PI) + (rnd() - 0.5) * 0.7;
    const x = s.x * VW - Math.cos(ang) * len * 0.5;
    const y = 40 + (rnd() - 0.5) * 22;
    paths += `<path d="${ribbon(x, y, len, ang, (rnd() - 0.5) * 0.9, 0.9 + rnd() * 0.5, 3.4 + rnd() * 2.2)}"/>`;
  }
});
writeFileSync(
  join(out, 'threads.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${VH}"><defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e2452a"/><stop offset="1" stop-color="#9c1b12"/></linearGradient></defs><g fill="url(#g)">${paths}</g></svg>`,
);
console.log('fertig', np, Math.round((Date.now() - t0) / 1000) + 's');
