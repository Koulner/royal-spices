'use strict';
// Ein Messverfahren fuer Referenz und Druckbild (beide als Verhaeltnisbild Farbe/Papier im Referenzmassstab).
const L = require('./lib.cjs');
const S = require('./satz.cjs');
const C = L.C;

// Druck-SVG im Raster W x H rendern, auf PAPIER legen, durch PAPIER teilen
async function druckRatio(svg, W, H) {
  const r = await L.renderSVG(svg, W, H); const P = C.PAPIER; const d = new Float32Array(W * H * 3);
  for (let k = 0; k < W * H; k++) { const a = r.d[k * 4 + 3] / 255; for (let c = 0; c < 3; c++) d[k * 3 + c] = (a * r.d[k * 4 + c] + (1 - a) * P[c]) / P[c]; }
  return { w: W, h: H, d };
}
function inks(ratio) { const o = {}; for (const m of ['gold', 'dunkel', 'farbe']) o[m] = L.inkMap(ratio, m); return o; }
function messeAlle(ratio, nur) {
  const I = inks(ratio); const out = {};
  for (const z of S.zeilen) { if (nur && !nur.has(z.id)) continue; out[z.id] = L.measureBox(I[z.mode], z.win, z.thr || 0.5, undefined, z.prof || 'second'); }
  return { boxes: out, I };
}
function gruppen(boxes) {
  const g = {};
  for (const [name, ids] of Object.entries(S.gruppen)) { const b = ids.map(i => boxes[i]).filter(Boolean); if (!b.length) continue;
    g[name] = { u0: Math.min(...b.map(x => x.u0)), u1: Math.max(...b.map(x => x.u1)), v0: Math.min(...b.map(x => x.v0)), v1: Math.max(...b.map(x => x.v1)) }; }
  return g;
}
// dunkelste 12 % (nach Helligkeit) der Tintenpixel (Tinte >= T im Rahmen) eines Elements bzw. einer Elementgruppe
function dunkel12(ratio, I, boxes, ids) {
  const { w, h, d } = ratio; const px = [];
  for (const id of ids) { const z = S.zeilen.find(q => q.id === id); const b = boxes[id]; if (!b) continue; const m = I[z.mode].m;
    for (let j = Math.max(0, Math.floor(b.v0 * h)); j < Math.min(h, Math.ceil(b.v1 * h)); j++) for (let i = Math.max(0, Math.floor(b.u0 * w)); i < Math.min(w, Math.ceil(b.u1 * w)); i++) {
      const k = j * w + i; if (m[k] >= b.T) px.push([d[k * 3] * 0.299 + d[k * 3 + 1] * 0.587 + d[k * 3 + 2] * 0.114, d[k * 3], d[k * 3 + 1], d[k * 3 + 2]]); } }
  px.sort((a, b) => a[0] - b[0]); const n = Math.max(1, Math.round(px.length * 0.12));
  return [1, 2, 3].map(c => px.slice(0, n).reduce((s, p) => s + p[c], 0) / n);
}
// Gauss-Faltung (separierbar, Radius ceil(4 sigma), Rand fortgesetzt) eines Bildes {w,h,d} mit beliebiger Kanalzahl
function falte(img, s) {
  if (!(s > 0)) return img; const { w, h, d } = img; const ch = d.length / (w * h), r = Math.ceil(4 * s), k = []; let sum = 0;
  for (let i = -r; i <= r; i++) { const v = Math.exp(-i * i / (2 * s * s)); k.push(v); sum += v; } for (let i = 0; i < k.length; i++) k[i] /= sum;
  const t = new Float32Array(d.length), o = new Float32Array(d.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < ch; c++) { let a = 0;
    for (let i = -r; i <= r; i++) a += k[i + r] * d[(y * w + Math.min(w - 1, Math.max(0, x + i))) * ch + c]; t[(y * w + x) * ch + c] = a; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < ch; c++) { let a = 0;
    for (let i = -r; i <= r; i++) a += k[i + r] * t[(Math.min(h - 1, Math.max(0, y + i)) * w + x) * ch + c]; o[(y * w + x) * ch + c] = a; }
  return { w, h, d: o };
}
// Modell (i) der Referenzunschaerfe (T-20261020-15): Referenz = WebP (VP8, immer 4:2:0) einer Aufnahme, entzerrt.
//  1 Druck (Verhaeltnisbild im Referenzmassstab) x Referenzpapier -> sRGB-Werte; YCbCr nach BT.601 (linear, Versatz ohne Belang).
//  2 Y (und gleich Cb/Cr): Gauss mit sY (= sqrt(sigmaY,ref^2 - sigmaDruck^2), nur Helligkeitskanten, faltung.cjs).
//  3 Cb/Cr im Raster des Referenzbilds (nicht des Referenzmassstabs): je 2 x 2-Block (gerade Pixelindizes, Pixelmitte = Index) der
//    Mittelwert; der Druck wird dafuer per inverser Homographie an den Referenzbildpixeln abgetastet (bikubisch). Rueckweg wie libwebp
//    'fancy upsampling' (9/3/3/1 = bilinear zwischen den Blockmitten 2b + 0,5), ausgewertet an der Quellposition jedes Rasterpixels
//    (dieselbe Homographie wie rectify). Gitterphase also aus der Lage des Etiketts im Referenzbild.
//  4 zurueck nach RGB, auf 0..255 begrenzt (8-bit-Ausgabe des Decoders), durch das Referenzpapier teilen.
function homographie(q) { // wie lib.squareToQuad, als Matrix; liefert Hin- und Rueckweg
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3, dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const den = dx1 * dy2 - dx2 * dy1, g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
  const A = [e - f * h, c * h - b, b * f - c * e, f * g - d, a - c * g, c * d - a * f, d * h - e * g, b * g - a * h, a * e - b * d]; // adjungierte
  return { hin: (u, v) => { const z = g * u + h * v + 1; return [(a * u + b * v + c) / z, (d * u + e * v + f) / z]; },
    zurueck: (x, y) => { const z = A[6] * x + A[7] * y + A[8]; return [(A[0] * x + A[1] * y + A[2]) / z, (A[3] * x + A[4] * y + A[5]) / z]; } };
}
//  3a (T-20261021-15) vor dem 2 x 2-Mittel zusaetzlich Gauss sC auf Cb/Cr (im Referenzmassstab; linear, darum gleich auf R, G, B
//     des mit sY gefalteten Bilds). Die Referenzfarbe ist unschaerfer als 4:2:0 allein (ROYAL R - B). sC = 0: bitgleich zu Modell (i).
function falteI(img, geo, sY, sC = 0) {
  const { w, h } = img, N = w * h, P = geo.papier, rgb = new Float32Array(N * 3);
  for (let k = 0; k < N * 3; k++) rgb[k] = img.d[k] * P[k % 3];
  const Bl = falte({ w, h, d: rgb }, sY), Bc = sC > 0 ? falte(Bl, sC) : Bl, Hm = homographie(geo.q), t = new Float32Array(3);
  const cb = (r, g, b) => -0.168736 * r - 0.331264 * g + 0.5 * b, cr = (r, g, b) => 0.5 * r - 0.418688 * g - 0.081312 * b;
  const ec = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => Hm.hin(u, v));
  const bx0 = Math.floor((Math.min(...ec.map(p => p[0])) - 0.5) / 2) - 2, bx1 = Math.ceil((Math.max(...ec.map(p => p[0])) - 0.5) / 2) + 2;
  const by0 = Math.floor((Math.min(...ec.map(p => p[1])) - 0.5) / 2) - 2, by1 = Math.ceil((Math.max(...ec.map(p => p[1])) - 0.5) / 2) + 2;
  const cw = bx1 - bx0 + 1, chh = by1 - by0 + 1, CB = new Float32Array(cw * chh), CR = new Float32Array(cw * chh);
  for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) { let sb = 0, sr = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const [u, v] = Hm.zurueck(2 * bx + dx, 2 * by + dy);
      L.sampleBicubic(Bc, u * w - 0.5, v * h - 0.5, t, 0); sb += cb(t[0], t[1], t[2]); sr += cr(t[0], t[1], t[2]); }
    CB[(by - by0) * cw + bx - bx0] = sb / 4; CR[(by - by0) * cw + bx - bx0] = sr / 4; }
  const o = new Float32Array(N * 3), cl = v => Math.min(255, Math.max(0, v));
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const [x, y] = Hm.hin((i + 0.5) / w, (j + 0.5) / h);
    const sx = (x - 0.5) / 2 - bx0, sy = (y - 0.5) / 2 - by0, xa = Math.floor(sx), ya = Math.floor(sy), tx = sx - xa, ty = sy - ya, p = ya * cw + xa;
    const bil = C2 => (C2[p] * (1 - tx) + C2[p + 1] * tx) * (1 - ty) + (C2[p + cw] * (1 - tx) + C2[p + cw + 1] * tx) * ty;
    const k = (j * w + i) * 3, r = Bl.d[k], g = Bl.d[k + 1], b = Bl.d[k + 2], Y = 0.299 * r + 0.587 * g + 0.114 * b, Cb = bil(CB), Cr = bil(CR);
    o[k] = cl(Y + 1.402 * Cr) / P[0]; o[k + 1] = cl(Y - 0.344136 * Cb - 0.714136 * Cr) / P[1]; o[k + 2] = cl(Y + 1.772 * Cb) / P[2]; }
  return { w, h, d: o };
}
// bilinear hochrechnen (Fenster), Schwelle 0,5 x eigener 99,5-%-Wert, IoU
function upWin(ink, win, s) {
  const { w, h, m } = ink; const i0 = Math.floor(win[0] * w), i1 = Math.ceil(win[1] * w), j0 = Math.floor(win[2] * h), j1 = Math.ceil(win[3] * h);
  const W = (i1 - i0) * s, H = (j1 - j0) * s; const o = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const fx = i0 + (x + 0.5) / s - 0.5, fy = j0 + (y + 0.5) / s - 0.5;
    const xa = Math.max(0, Math.min(w - 2, Math.floor(fx))), ya = Math.max(0, Math.min(h - 2, Math.floor(fy))); const tx = Math.min(1, Math.max(0, fx - xa)), ty = Math.min(1, Math.max(0, fy - ya));
    o[y * W + x] = (m[ya * w + xa] * (1 - tx) + m[ya * w + xa + 1] * tx) * (1 - ty) + (m[(ya + 1) * w + xa] * (1 - tx) + m[(ya + 1) * w + xa + 1] * tx) * ty; }
  const srt = Float32Array.from(o).sort(); return { W, H, o, T: 0.5 * srt[Math.floor(srt.length * 0.995)] };
}
function iou(inkA, inkB, win, s = 4) {
  const A = upWin(inkA, win, s), B = upWin(inkB, win, s); let i = 0, u = 0;
  for (let k = 0; k < A.o.length; k++) { const a = A.o[k] >= A.T, b = B.o[k] >= B.T; if (a && b) i++; if (a || b) u++; }
  return { iou: i / u, A, B };
}
function buchstaben(ink, z, b, n) {
  const { w, h, m } = ink; const j0 = Math.floor(b.v0 * h), j1 = Math.ceil(b.v1 * h) - 1, i0 = Math.floor(z.win[0] * w), i1 = Math.ceil(z.win[1] * w);
  const col = []; for (let i = i0; i <= i1; i++) { let mx = 0; for (let j = j0; j <= j1; j++) mx = Math.max(mx, m[j * w + i]); col.push(mx); }
  for (const f of [0.5, 0.6, 0.7, 0.4]) { const T = f * Math.max(...col); const runs = []; let a = -1;
    for (let k = 0; k <= col.length; k++) { const on = k < col.length && col[k] >= T; if (on && a < 0) a = k; if (!on && a >= 0) {
      const lo = a > 0 ? a - 1 + (T - col[a - 1]) / (col[a] - col[a - 1]) : a, hi = k - 1 + (col[k - 1] - T) / (col[k - 1] - (col[k] || 0)); runs.push([(i0 + lo) / w, (i0 + hi + 1) / w]); a = -1; } }
    if (runs.length === n) return runs; }
  return null;
}
module.exports = { falte, falteI, homographie, buchstaben, druckRatio, inks, messeAlle, gruppen, dunkel12, iou, upWin };
