'use strict';
// Referenz einlesen, Etikett entzerren (Homographie aus den vier Kantengeraden), Papierlicht als Polynom schaetzen.
const L = require('./lib.cjs');

// Bereiche ohne Papier: Rand, Bandspitze, Schale unten rechts (Bruchteile u,v)
const AUSSCHLUSS = (u, v) => u < 0.015 || u > 0.985 || v < 0.012 || v > 0.988 || (v < 0.15 && u > 0.30 && u < 0.70) || (u > 0.70 && v > 0.92);

let cache = null;
async function referenz(scale = 1) {
  if (!cache) {
    const img = await L.loadRGB(L.refPath());
    const { q, fits } = L.labelQuad(img);
    const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const Lw = (d(q[0], q[1]) + d(q[3], q[2])) / 2, Lh = (d(q[0], q[3]) + d(q[1], q[2])) / 2;
    const W = Math.round(Lw), H = Math.round(Lw / L.C.FORMAT.breiteZuHoehe);
    const rect = L.rectify(img, q, W, H);
    const paper = L.fitPaper(rect, AUSSCHLUSS, 4);
    let s = [0, 0, 0], n = 0; // Papiermittel der Referenz (Originalwerte der Papierpixel)
    for (let k = 0; k < W * H; k++) if (paper.keep[k]) { for (let c = 0; c < 3; c++) s[c] += rect.d[k * 3 + c]; n++; }
    cache = { img, q, fits, Lw, Lh, W, H, rect, paper, paperMean: s.map(v => v / n), ratio: L.ratioImage(rect, paper) };
  }
  if (scale === 1) return cache;
  const r = L.rectify(cache.img, cache.q, cache.W * scale, cache.H * scale);
  return { ...cache, rectS: r, ratioS: L.ratioImage(r, cache.paper), scale };
}
module.exports = { referenz, AUSSCHLUSS };
