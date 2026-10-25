'use strict';
// Teil C: Berglandschaft aus der entzerrten Referenz uebernommen (nicht neu gezeichnet).
// Verhaeltnisbild (Papierlicht per Polynom entfernt) -> Text/Flagge maskiert und per Diffusion gefuellt -> verdeckte Ecke
// unten rechts aus der gespiegelten Ecke links ergaenzt -> Deckung (Alpha) -> hochgerechnet auf die Groesse von etikett.png.
// Aufruf: node berge.cjs [pruefungsordner]   (ohne Ordner: nur berge.png)
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const R = require('./referenz.cjs');
const C = L.C;

const P = {
  V0: 0.58,                    // Bergzone ab v (darueber Papier)
  RAND: 2,                     // Rand um die Text-/Flaggenrahmen aus satz-werte.json (Referenzpixel)
  ECKE: { u: 0.70, v: 0.90, weich: 0.03 }, // von der Safranschale verdeckte Ecke: gespiegelt ergaenzt, weicher Uebergang
  VOLL: 0.01,                  // dunkelste 1 % der Bergpixel = volle Deckung (Strichfarbe)
  KNIE: 0.08,                  // Deckung darunter gilt als Papierkorn (-> 0)
  VERFAHREN: ['nearest', 'catmull-rom', 'mitchell', 'lanczos3'], // verglichen
  WAHL: 'mitchell',            // gewaehlt (geringstes Ueberschwingen ohne Treppen, siehe messung.md)
};

async function bergeQuelle() {
  const ref = await R.referenz(); const { W, H, ratio } = ref; const N = W * H;
  const t0 = new Float32Array(N); for (let k = 0; k < N; k++) t0[k] = (ratio.d[k * 3] + ratio.d[k * 3 + 1] + ratio.d[k * 3 + 2]) / 3;
  // Masken: Text und Flagge in der Bergzone
  const werte = JSON.parse(fs.readFileSync(path.join(__dirname, 'satz-werte.json'), 'utf8')).elemente; const rects = [];
  for (const [id, w] of Object.entries(werte)) { const [u0, u1, v0, v1] = w.box; if (v1 < P.V0 - 0.01) continue;
    rects.push({ id, x0: Math.max(0, Math.floor(u0 * W) - P.RAND), x1: Math.min(W - 1, Math.ceil(u1 * W) + P.RAND), y0: Math.max(0, Math.floor(v0 * H) - P.RAND), y1: Math.min(H - 1, Math.ceil(v1 * H) + P.RAND) }); }
  const mask = new Uint8Array(N); for (const r of rects) for (let j = r.y0; j <= r.y1; j++) for (let i = r.x0; i <= r.x1; i++) mask[j * W + i] = 1;
  const t = Float32Array.from(t0);
  // verdeckte Ecke: Spiegelbild der linken Ecke, weich eingeblendet
  const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const u = (i + 0.5) / W, v = (j + 0.5) / H;
    const g = sm((u - P.ECKE.u) / P.ECKE.weich) * sm((v - P.ECKE.v) / P.ECKE.weich); if (g > 0) { const k = j * W + i; t[k] = t[k] * (1 - g) + t0[j * W + (W - 1 - i)] * g; } }
  // Diffusion (Laplace) in den Masken, Start Papier
  for (let k = 0; k < N; k++) if (mask[k]) t[k] = 1;
  for (let it = 0; it < 600; it++) for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) { const k = j * W + i; if (mask[k]) t[k] = (t[k - 1] + t[k + 1] + t[k - W] + t[k + W]) / 4; }
  // volle Deckung: dunkelste 1 % der Bergpixel (ohne Masken, ohne Ecke)
  const zone = []; for (let j = Math.ceil(P.V0 * H); j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (!mask[k] && !((i + 0.5) / W > P.ECKE.u && (j + 0.5) / H > P.ECKE.v)) zone.push(k); }
  zone.sort((a, b) => t0[a] - t0[b]); const nV = Math.max(1, Math.round(zone.length * P.VOLL)); const rVoll = [0, 1, 2].map(c => zone.slice(0, nV).reduce((s, k) => s + ratio.d[k * 3 + c], 0) / nV);
  const tVoll = (rVoll[0] + rVoll[1] + rVoll[2]) / 3;
  const alpha = q => { const a = Math.max(0, Math.min(1, (1 - q) / (1 - tVoll))); return Math.max(0, (a - P.KNIE) / (1 - P.KNIE)); };
  const A = new Float32Array(N), Aref = new Float32Array(N);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; const z = (j + 0.5) / H >= P.V0 ? 1 : 0; A[k] = z * alpha(t[k]); Aref[k] = z * alpha(t0[k]); }
  return { ref, W, H, t0, t, mask, rects, rVoll, tVoll, A, Aref };
}
const u8 = f => L.toU8(Float32Array.from(f, v => v * 255));
// Eigene separierbare Hochrechnung (sharp/libvips wendet den Kern beim Vergroessern nicht an: alle Kerne lieferten dasselbe Bild)
const KERNE = {
  nearest: { r: 0.5, f: x => (x >= -0.5 && x < 0.5 ? 1 : 0) },
  'catmull-rom': { r: 2, f: x => bc(x, 0, 0.5) },
  mitchell: { r: 2, f: x => bc(x, 1 / 3, 1 / 3) },
  lanczos3: { r: 3, f: x => (x === 0 ? 1 : Math.abs(x) >= 3 ? 0 : 3 * Math.sin(Math.PI * x) * Math.sin(Math.PI * x / 3) / (Math.PI * Math.PI * x * x)) },
};
function bc(x, B, Cc) { x = Math.abs(x); return x < 1 ? ((12 - 9 * B - 6 * Cc) * x ** 3 + (-18 + 12 * B + 6 * Cc) * x * x + (6 - 2 * B)) / 6
  : x < 2 ? ((-B - 6 * Cc) * x ** 3 + (6 * B + 30 * Cc) * x * x + (-12 * B - 48 * Cc) * x + (8 * B + 24 * Cc)) / 6 : 0; }
function gewichte(n, m, K) { const out = []; for (let x = 0; x < m; x++) { const c = (x + 0.5) * n / m - 0.5; const i0 = Math.ceil(c - K.r), i1 = Math.floor(c + K.r); const ix = [], wt = []; let s = 0;
  for (let i = i0; i <= i1; i++) { const w = K.f(i - c); if (w === 0) continue; ix.push(Math.max(0, Math.min(n - 1, i))); wt.push(w); s += w; } out.push({ ix, wt: wt.map(w => w / s) }); } return out; }
async function hoch(a8, W, H, w, h, kernel) { const K = KERNE[kernel], gx = gewichte(W, w, K), gy = gewichte(H, h, K); const tmp = new Float32Array(w * H), out = new Uint8Array(w * h);
  for (let j = 0; j < H; j++) for (let x = 0; x < w; x++) { const g = gx[x]; let s = 0; for (let t = 0; t < g.ix.length; t++) s += a8[j * W + g.ix[t]] * g.wt[t]; tmp[j * w + x] = s; }
  for (let y = 0; y < h; y++) { const g = gy[y]; for (let x = 0; x < w; x++) { let s = 0; for (let t = 0; t < g.ix.length; t++) s += tmp[g.ix[t] * w + x] * g.wt[t]; out[y * w + x] = s <= 0 ? 0 : s >= 255 ? 255 : Math.round(s); } }
  return out; }

// berge.png (RGBA, Farbe = PAPIER x rVoll, Alpha = Deckung) in Groesse w x h
async function bergePNG(file, w, h) {
  const Q = await bergeQuelle(); const up = await hoch(u8(Q.A), Q.W, Q.H, w, h, P.WAHL); const col = C.PAPIER.map((p, c) => Math.round(p * Q.rVoll[c]));
  const out = Buffer.alloc(w * h * 4); for (let k = 0; k < w * h; k++) { out[k * 4] = col[0]; out[k * 4 + 1] = col[1]; out[k * 4 + 2] = col[2]; out[k * 4 + 3] = up[k]; }
  fs.mkdirSync(path.dirname(file), { recursive: true }); await L.sharp(out, { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(file);
  return { Q, up, col };
}

// Pruefung: Verfahrensvergleich, entfernte Stellen, Kantenlage
function canvas(w, h, v = 255) { return { w, h, d: new Uint8Array(w * h).fill(v) }; }
function paste(cv, src, sw, sx, sy, cw, ch, x, y) { for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) cv.d[(y + j) * cv.w + x + i] = src[(sy + j) * sw + sx + i]; }
const grau = cv => L.sharp(Buffer.from(cv.d), { raw: { width: cv.w, height: cv.h, channels: 1 } }).png();
function kanteOben(get, i, j0, j1) { for (let j = j0 + 1; j <= j1; j++) if (get(i, j) >= 0.5) { const a = get(i, j - 1), b = get(i, j); return j - 1 + (0.5 - a) / (b - a || 1); } return NaN; }

async function pruefung(dir, Q, up, w, h) {
  const { W, H } = Q; const rep = { parameter: P, rVoll: Q.rVoll.map(v => +v.toFixed(4)), farbe: L.hex(C.PAPIER.map((p, c) => p * Q.rVoll[c])), verfahren: {}, kanten: [] };
  // 1) Verfahren bei 2x und 4x: Ueberschwingen (Anteil Pixel ausserhalb [min-3, max+3] der 2x2-Quellnachbarn), Treppenmass
  //    (mittlerer Sprung an Blockgrenzen / im Blockinneren; 1 = keine Treppen), Ausschnitt 112 x 70 Quellpixel (Berge links)
  const a8 = u8(Q.A); const cx = 18, cy = 328, cw = 112, ch = 70; const rows = [];
  for (const k of P.VERFAHREN) { rep.verfahren[k] = {};
    for (const s of [2, 4]) { const U = await hoch(a8, W, H, W * s, H * s, k); let over = 0, n = 0, gB = 0, nB = 0, gI = 0, nI = 0;
      for (let y = Math.ceil(P.V0 * H) * s; y < H * s - s; y++) for (let x = s; x < W * s - s; x++) { const fx = (x + 0.5) / s - 0.5, fy = (y + 0.5) / s - 0.5, i = Math.floor(fx), j = Math.floor(fy);
        const q = [a8[j * W + i], a8[j * W + i + 1], a8[(j + 1) * W + i], a8[(j + 1) * W + i + 1]]; const v = U[y * W * s + x]; if (v > Math.max(...q) + 3 || v < Math.min(...q) - 3) over++; n++;
        const dlt = Math.abs(U[y * W * s + x] - U[y * W * s + x - 1]); if (x % s === 0) { gB += dlt; nB++; } else { gI += dlt; nI++; } }
      rep.verfahren[k][s + 'x'] = { ueberschwingen: +(over / n).toFixed(5), treppen: +((gB / nB) / (gI / nI || 1)).toFixed(3) }; rows.push({ k, s, U }); } }
  const G = 8, cv = canvas(cw * 2 + cw * 4 + 3 * G, P.VERFAHREN.length * (ch * 4 + G) + G);
  P.VERFAHREN.forEach((k, r) => { for (const s of [2, 4]) { const U = rows.find(o => o.k === k && o.s === s).U; paste(cv, U.map(v => 255 - v), W * s, cx * s, cy * s, cw * s, ch * s, s === 2 ? G : cw * 2 + 2 * G, G + r * (ch * 4 + G)); } });
  await grau(cv).toFile(path.join(dir, 'berge-vergleich.png'));
  // 2) entfernte Stellen: vorher (Referenz) | nachher, 100 %
  const g0 = u8(Q.t0.map(v => Math.min(1, v))), g1 = u8(Q.t.map(v => Math.min(1, v)));
  const items = [...Q.rects, { id: 'Ecke', x0: Math.floor(P.ECKE.u * W), x1: W - 1, y0: Math.floor(P.ECKE.v * H), y1: H - 1 }].map(r => ({ ...r, x0: Math.max(0, r.x0 - 4), x1: Math.min(W - 1, r.x1 + 4), y0: Math.max(0, r.y0 - 4), y1: Math.min(H - 1, r.y1 + 4) }));
  const bw = Math.max(...items.map(r => r.x1 - r.x0 + 1)), cv2 = canvas(2 * bw + 3 * G, items.reduce((s, r) => s + r.y1 - r.y0 + 1 + G, G));
  let yy = G; for (const r of items) { const iw = r.x1 - r.x0 + 1, ih = r.y1 - r.y0 + 1; paste(cv2, g0, W, r.x0, r.y0, iw, ih, G, yy); paste(cv2, g1, W, r.x0, r.y0, iw, ih, bw + 2 * G, yy); yy += ih + G; }
  await grau(cv2).toFile(path.join(dir, 'berge-entfernt.png')); rep.entfernt = items.map(r => r.id);
  // 3) Kantenlage: oberste Bergkante (Deckung 0,5) je Spalte, Referenz (Referenzmassstab) gegen berge.png (umgerechnet)
  const sy = h / H, sx = w / W; const j0 = Math.ceil(0.60 * H), j1 = H - 2;
  for (const u of [0.02, 0.05, 0.08, 0.11, 0.14, 0.17, 0.20, 0.80, 0.83, 0.86, 0.89, 0.92, 0.95, 0.98]) { const i = Math.floor(u * W);
    const gr = (ii, j) => (Q.Aref[j * W + ii - 1] + Q.Aref[j * W + ii] + Q.Aref[j * W + ii + 1]) / 3; const yr = kanteOben(gr, i, j0, j1);
    const X = Math.round((i + 0.5) * sx - 0.5), hb = Math.round(1.5 * sx), gd = (ii, jj) => { let a = 0; for (let d = -hb; d <= hb; d++) a += up[jj * w + ii + d]; return a / (2 * hb + 1) / 255; }; const yd = kanteOben(gd, X, Math.ceil(j0 * sy), h - 2);
    const ydRef = (yd + 0.5) / sy - 0.5; rep.kanten.push({ u, ref_px: +yr.toFixed(2), druck_px: +ydRef.toFixed(2), diff_Lw_proz: +(Math.abs(ydRef - yr) / W * 100).toFixed(3) }); }
  fs.writeFileSync(path.join(dir, 'berge-messung.json'), JSON.stringify(rep, null, 1)); return rep;
}

module.exports = { P, bergeQuelle, bergePNG, pruefung };
if (require.main === module) (async () => {
  const h = C.FORMAT.pngHoehe, w = Math.round(h * C.FORMAT.breiteZuHoehe);
  const { Q, up } = await bergePNG(path.resolve(__dirname, '../berge.png'), w, h);
  if (process.argv[2]) { fs.mkdirSync(process.argv[2], { recursive: true }); const r = await pruefung(process.argv[2], Q, up, w, h); console.log(JSON.stringify({ rVoll: r.rVoll, farbe: r.farbe, verfahren: r.verfahren, kanten: r.kanten.map(k => k.u + ':' + k.diff_Lw_proz) })); }
})();
