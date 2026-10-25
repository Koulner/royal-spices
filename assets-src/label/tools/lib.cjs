'use strict';
// Gemeinsame Bausteine: Module laden, Referenz entzerren, Licht ausgleichen, messen, Schrift in Pfade.
const path = require('path');
const fs = require('fs');
const C = require('./config.cjs');

function req(name, sub = '') {
  const tries = [path.resolve(__dirname, '../../../node_modules', name), path.join(C.NODE_MODULES_FALLBACK, name)];
  for (const p of tries) if (fs.existsSync(p)) return require(path.join(p, sub));
  throw new Error('Modul nicht gefunden: ' + name);
}
const sharp = req('sharp');
sharp.cache(false); sharp.concurrency(1);
const fontkit = req('fontkitten', 'dist/index.js');

function refPath() {
  const p = path.resolve(__dirname, '../../photos/ref-glas-1910.webp');
  return fs.existsSync(p) ? p : C.REF_FALLBACK;
}

async function loadRGB(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const d = new Float32Array(data.length); for (let i = 0; i < data.length; i++) d[i] = data[i];
  return { w: info.width, h: info.height, d };
}
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

// ---------- Kanten des Etiketts und Entzerrung ----------
function crossing(get, a, b, step) {
  for (let t = a; t !== b; t += step) {
    let ok = true; for (let k = 0; k < 8; k++) if (get(t + k * step) < 170) { ok = false; break; }
    let dark = false; for (let k = 1; k <= 4; k++) if (get(t - k * step) < 110) dark = true;
    if (ok && dark) { let u = t; while (get(u - step) >= 150) u -= step; const v0 = get(u - step), v1 = get(u); return u - step + step * (150 - v0) / (v1 - v0); }
  }
  return NaN;
}
function robustLine(pts) { // pts [[s,t]] -> t = a*s + b, iterativ ohne Ausreisser
  let use = pts.filter(p => isFinite(p[1]));
  const med = [...use.map(p => p[1])].sort((x, y) => x - y)[Math.floor(use.length / 2)];
  use = use.filter(p => Math.abs(p[1] - med) < 6);
  let a = 0, b = 0;
  for (let it = 0; it < 6; it++) {
    const n = use.length; let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const [s, t] of use) { sx += s; sy += t; sxx += s * s; sxy += s * t; }
    a = (n * sxy - sx * sy) / (n * sxx - sx * sx); b = (sy - a * sx) / n;
    const res = use.map(([s, t]) => Math.abs(t - (a * s + b))); const sorted = [...res].sort((x, y) => x - y);
    const lim = Math.max(0.8, 2.5 * sorted[Math.floor(sorted.length / 2)]);
    use = use.filter((p, i) => res[i] <= lim);
  }
  const rms = Math.sqrt(use.reduce((q, [s, t]) => q + (t - (a * s + b)) ** 2, 0) / use.length);
  return { a, b, n: use.length, rms };
}
function labelQuad(img) {
  const { w, d } = img; const L = (x, y) => { const i = (y * w + x) * 3; return lum(d[i], d[i + 1], d[i + 2]); };
  const E = C.KANTEN;
  const side = (rng, f) => { const p = []; for (const [a, b] of rng) for (let s = a; s <= b; s++) p.push([s, f(s)]); return robustLine(p); };
  const top = side(E.oben, x => crossing(t => L(x, t), E.yOben[0], E.yOben[1], 1));
  const bot = side(E.unten, x => crossing(t => L(x, t), E.yUnten[1], E.yUnten[0], -1));
  const lef = side(E.links, y => crossing(t => L(t, y), E.xLinks[0], E.xLinks[1], 1));
  const rig = side(E.rechts, y => crossing(t => L(t, y), E.xRechts[1], E.xRechts[0], -1));
  const meet = (h, v) => { const y = (h.a * v.b + h.b) / (1 - h.a * v.a); return [v.a * y + v.b, y]; }; // y=ha*x+hb, x=va*y+vb
  const q = [meet(top, lef), meet(top, rig), meet(bot, rig), meet(bot, lef)];
  return { q, fits: { top, bot, lef, rig } };
}
function squareToQuad(q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3, dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const den = dx1 * dy2 - dx2 * dy1, g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0, dd = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
  return (u, v) => { const z = g * u + h * v + 1; return [(a * u + b * v + c) / z, (dd * u + e * v + f) / z]; };
}
function cubicW(t) { t = Math.abs(t); return t < 1 ? 1.5 * t * t * t - 2.5 * t * t + 1 : t < 2 ? -0.5 * t * t * t + 2.5 * t * t - 4 * t + 2 : 0; }
function sampleBicubic(img, x, y, out, o) {
  const { w, h, d } = img; const xi = Math.floor(x), yi = Math.floor(y);
  let r = 0, g = 0, b = 0, ws = 0;
  for (let j = -1; j <= 2; j++) { const yy = Math.min(h - 1, Math.max(0, yi + j)); const wy = cubicW(y - (yi + j));
    for (let i = -1; i <= 2; i++) { const xx = Math.min(w - 1, Math.max(0, xi + i)); const wt = wy * cubicW(x - (xi + i)); const k = (yy * w + xx) * 3;
      r += wt * d[k]; g += wt * d[k + 1]; b += wt * d[k + 2]; ws += wt; } }
  out[o] = r / ws; out[o + 1] = g / ws; out[o + 2] = b / ws;
}
function rectify(img, q, W, H) { // Etikett -> Rechteck W x H (Pixelmitte = Index)
  const map = squareToQuad(q); const d = new Float32Array(W * H * 3);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const [x, y] = map((i + 0.5) / W, (j + 0.5) / H); sampleBicubic(img, x, y, d, (j * W + i) * 3); }
  return { w: W, h: H, d };
}

// ---------- Lichtausgleich: Papierfarbe als Polynom 4. Grades in (u,v) ----------
function polyTerms(u, v, deg) { const t = []; for (let i = 0; i <= deg; i++) for (let j = 0; j <= deg - i; j++) t.push(u ** i * v ** j); return t; }
function solve(A, bv) { const n = bv.length; const M = A.map((r, i) => [...r, bv[i]]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } }
  return M.map((r, i) => r[n] / r[i]); }
function fitPaper(img, excl, deg = 4) { // excl(u,v)->true: nicht verwenden
  const { w, h, d } = img; let keep = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const u = (i + 0.5) / w, v = (j + 0.5) / h; if (!excl(u, v)) keep[j * w + i] = 1; }
  let coef;
  for (let it = 0; it < 6; it++) {
    const nT = polyTerms(0, 0, deg).length; const A = Array.from({ length: nT }, () => new Float64Array(nT)); const B = [0, 1, 2].map(() => new Float64Array(nT));
    for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) { const k = j * w + i; if (!keep[k]) continue;
      const t = polyTerms((i + 0.5) / w, (j + 0.5) / h, deg);
      for (let a = 0; a < nT; a++) { for (let b = 0; b < nT; b++) A[a][b] += t[a] * t[b]; for (let c = 0; c < 3; c++) B[c][a] += t[a] * d[k * 3 + c]; } }
    coef = [0, 1, 2].map(c => solve(A.map(r => [...r]), [...B[c]]));
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = j * w + i; if (!keep[k]) continue;
      const bg = paperAt(coef, (i + 0.5) / w, (j + 0.5) / h, deg); const L0 = lum(bg[0], bg[1], bg[2]), L1 = lum(d[k * 3], d[k * 3 + 1], d[k * 3 + 2]);
      if (L1 < L0 * 0.94 || L1 > L0 * 1.06) keep[k] = 0; }
  }
  return { coef, deg, keep };
}
function paperAt(coef, u, v, deg) { const t = polyTerms(u, v, deg); return coef.map(cc => cc.reduce((s, c, i) => s + c * t[i], 0)); }
function ratioImage(img, paper) { // I / Papier je Kanal
  const { w, h, d } = img; const r = new Float32Array(d.length);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const bg = paperAt(paper.coef, (i + 0.5) / w, (j + 0.5) / h, paper.deg); const k = (j * w + i) * 3;
    for (let c = 0; c < 3; c++) r[k + c] = d[k + c] / bg[c]; }
  return { w, h, d: r };
}

// ---------- Messen ----------
// Tinte je Pixel: 'gold' = Chroma (R-B) des Verhaeltnisbilds, 'dunkel' = 1 - mittlere Helligkeit
function inkMap(rimg, mode) {
  const { w, h, d } = rimg; const m = new Float32Array(w * h);
  for (let k = 0; k < w * h; k++) { const r = d[k * 3], g = d[k * 3 + 1], b = d[k * 3 + 2];
    m[k] = mode === 'gold' ? Math.max(0, (r - b) - 0.04) : mode === 'farbe' ? Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b), 1 - (r + g + b) / 3) : Math.max(0, 1 - (r + g + b) / 3); }
  return { w, h, m };
}
function second(arr) { let a = -1, b = -1; for (const v of arr) { if (v > a) { b = a; a = v; } else if (v > b) b = v; } return b; }
// Rahmen eines Elements im Fenster win = [u0,u1,v0,v1] (Etikettbruchteile); Schwelle = thr * 95-%-Wert der Tinte im Fenster
function measureBox(ink, win, thr = 0.5, norm, prof = 'second') {
  const pick = prof === 'max' ? (a => Math.max(...a)) : second;
  const { w, h, m } = ink; const i0 = Math.max(0, Math.floor(win[0] * w)), i1 = Math.min(w - 1, Math.ceil(win[1] * w)), j0 = Math.max(0, Math.floor(win[2] * h)), j1 = Math.min(h - 1, Math.ceil(win[3] * h));
  const vals = []; for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) vals.push(m[j * w + i]); vals.sort((a, b) => a - b);
  const full = norm || vals[Math.floor(vals.length * 0.995)]; const T = thr * full;
  const rows = [], cols = [];
  for (let j = j0; j <= j1; j++) { const r = []; for (let i = i0; i <= i1; i++) r.push(m[j * w + i]); rows.push(pick(r)); }
  for (let i = i0; i <= i1; i++) { const c = []; for (let j = j0; j <= j1; j++) c.push(m[j * w + i]); cols.push(pick(c)); }
  if (prof === 'runs') return { cols, i0, j0, T };
  const ends = (p, o) => { let a = p.findIndex(v => v >= T), b = p.length - 1 - [...p].reverse().findIndex(v => v >= T); if (a < 0) return [NaN, NaN];
    const lo = a > 0 ? a - 1 + (T - p[a - 1]) / (p[a] - p[a - 1]) : a; const hi = b < p.length - 1 ? b + (p[b] - T) / (p[b] - p[b + 1]) : b; return [o + lo, o + hi]; };
  const [y0, y1] = ends(rows, j0), [x0, x1] = ends(cols, i0);
  // Pixelmitten: Kante bei Index - 0.5 .. + 0.5 -> Bruchteile
  return { u0: (x0) / w, u1: (x1 + 1) / w, v0: (y0) / h, v1: (y1 + 1) / h, full, T };
}

// ---------- Schrift -> Pfade ----------
const fontCache = {};
function font(file, wght) { const key = file + '@' + wght; if (!fontCache[key]) { const f = fontkit.create(fs.readFileSync(file)); fontCache[key] = f.variationAxes && f.variationAxes.wght ? f.getVariation({ wght }) : f; } return fontCache[key]; }
// liefert Glyphen mit Pfad (Fonteinheiten, y nach oben) und Tintenrahmen
function shape(file, wght, text) {
  const f = font(file, wght); const gl = f.glyphsForString(text); let x = 0; const out = [];
  for (const g of gl) { const bb = g.path.bbox; out.push({ g, x, adv: g.advanceWidth, bb: isFinite(bb.minX) ? bb : null, ch: g }); x += g.advanceWidth; }
  return { upm: f.unitsPerEm, glyphs: out };
}
// Zeile so setzen, dass der Tintenrahmen genau box = {x0,x1,y0,y1} (Zieleinheiten) fuellt; Laufweite gleichmaessig
function setLine(file, wght, text, box, opt = {}) {
  const s = shape(file, wght, text); const G = s.glyphs.filter(q => q.bb);
  let top = -Infinity, bot = Infinity; for (const q of G) { top = Math.max(top, q.bb.maxY); bot = Math.min(bot, q.bb.minY); }
  const k = (box.y1 - box.y0) / (top - bot); // Fonteinheit -> Zieleinheit
  const first = s.glyphs.find(q => q.bb), last = [...s.glyphs].reverse().find(q => q.bb);
  const nat = (last.x + last.bb.maxX - (first.x + first.bb.minX)) * k; const nGap = s.glyphs.length - 1;
  const track = nGap > 0 ? (box.x1 - box.x0 - nat) / nGap : 0;
  const ox = box.x0 - first.bb.minX * k - first.x * k; const base = box.y0 + top * k;
  let d = '';
  if (opt.mitten && opt.mitten.length === G.length) { let sx = 1, n = 0;
    if (opt.breiten) { const r = G.map((q, i) => opt.breiten[i] / ((q.bb.maxX - q.bb.minX) * k)).sort((a, b) => a - b); sx = Math.max(0.85, Math.min(1.15, r[Math.floor(r.length / 2)])); }
    for (const q of s.glyphs) { if (!q.bb) continue; const tx = opt.mitten[n++] - (q.bb.minX + q.bb.maxX) / 2 * k * sx; d += transformPath(q.g.path, k, tx, base, sx); }
    return { d, size: k * s.upm, k, sx, glyphs: G };
  }
  s.glyphs.forEach((q, i) => { if (!q.bb) return; const tx = ox + q.x * k + i * track; d += transformPath(q.g.path, k, tx, base); });
  return { d, size: k * s.upm, track, k, glyphs: G };
}
function transformPath(p, k, tx, base, sx = 1) {
  const f = v => (Math.round(v * 1000) / 1000).toString(); let d = '';
  for (const c of p.commands) { const a = c.args; const P = (x, y) => f(tx + x * k * sx) + ' ' + f(base - y * k);
    if (c.command === 'moveTo') d += 'M' + P(a[0], a[1]); else if (c.command === 'lineTo') d += 'L' + P(a[0], a[1]);
    else if (c.command === 'quadraticCurveTo') d += 'Q' + P(a[0], a[1]) + ' ' + P(a[2], a[3]);
    else if (c.command === 'bezierCurveTo') d += 'C' + P(a[0], a[1]) + ' ' + P(a[2], a[3]) + ' ' + P(a[4], a[5]);
    else if (c.command === 'closePath') d += 'Z'; }
  return d;
}

// ---------- Bild-Ein-/Ausgabe ----------
function sized(svg, W, H) { return svg.replace(/<svg([^>]*?) width="[^"]*" height="[^"]*"/, `<svg$1 width="${W}" height="${H}"`); }
async function renderSVG(svg, W, H) { const { data, info } = await sharp(Buffer.from(sized(svg, W, H)), { density: 72, limitInputPixels: false }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== W || info.height !== H) throw new Error(`Rendergroesse ${info.width}x${info.height} statt ${W}x${H}`); return { w: info.width, h: info.height, d: data }; }
async function savePNG(file, buf, w, h, ch, opts = {}) { fs.mkdirSync(path.dirname(file), { recursive: true }); await sharp(Buffer.from(buf.buffer || buf, buf.byteOffset || 0, buf.length), { raw: { width: w, height: h, channels: ch } }).png({ compressionLevel: 9, adaptiveFiltering: false, ...opts }).withMetadata(false).toFile(file); }
function toU8(f) { const u = new Uint8Array(f.length); for (let i = 0; i < f.length; i++) u[i] = Math.max(0, Math.min(255, Math.round(f[i]))); return u; }
const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

module.exports = { sized, sharp, fontkit, C, refPath, loadRGB, lum, labelQuad, squareToQuad, rectify, sampleBicubic, fitPaper, paperAt, ratioImage, inkMap, measureBox, shape, setLine, transformPath, renderSVG, savePNG, toU8, hex, robustLine };
