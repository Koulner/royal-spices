'use strict';
// Blattlogo (Band) und Bandzeichen (Korkoberseite) als gefuellte Linienzeichnung (fill, kein stroke):
//  - drei Blaetter als Umriss: aeussere minus innere Linse (je zwei kubische Bezier Basis -> Spitze, evenodd), Spitzen spitz
//  - Mittelrippe, Seitenrippen, Stiel, Seitenzweige als Striche variabler Breite (Mittellinie kubisch, Breite an 5 Stellen
//    t = 0, 1/4, 1/2, 3/4, 1), Enden spitz (linear auf 0 ueber Laenge L), gerade (quer abgeschnitten) oder stumpf (verdeckt)
//  - Knoten an den Verzweigungen als Dreiecke (unter dem Mittelblatt, an der Gabel, an den Ansaetzen der Seitenblaetter)
// Geometrie in Referenzpixeln (ref-glas-1910.webp), fest in logo-werte.json. Startwerte: Mittellinien aus T-20261019-02.
// Anpassung: Koordinatenabstieg auf die weiche 50-%-Maskendifferenz (2x bilinear), danach auf das Umrissmass selbst.
// Aufruf zum Anpassen: node logo.cjs anpassen, danach node logo.cjs nachschaerfen   (Bandzeichen: node logo-pruefen.cjs <pruefordner> zeichen)
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const M = require('./messen.cjs');

// ---------- Startgeometrie (Mittellinien T-20261019-02, Strich 4,2 px) ----------
const N0 = { T: [258, 157.075], B: [256.875, 226], RT: [257.5, 188.075], J: [256.5, 265], SB: [256.25, 292.3], LT: [217.125, 195.125], LB: [242, 244.375],
  LR: [228.75, 216.5], RTt: [297.75, 195.75], RB: [272.375, 245], RR: [285.125, 218] };
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
function startBlatt(B, T, l1, l2, r1, r2, h = 2.1) { // Mittellinie -> aeussere und innere Linse
  const ax = [T[0] - B[0], T[1] - B[1]], n = Math.hypot(...ax), u = [ax[0] / n, ax[1] / n], mid = lerp(B, T, 0.5);
  const quer = (p, s) => { const v = [p[0] - mid[0], p[1] - mid[1]], q = v[0] * -u[1] + v[1] * u[0], sg = Math.sign(q) || 1; return [p[0] + s * sg * h * -u[1], p[1] + s * sg * h * u[0]]; };
  const mk = s => [[B[0] - s * 2.5 * u[0], B[1] - s * 2.5 * u[1]], quer(l1, s), quer(l2, s), [T[0] + s * 2.5 * u[0], T[1] + s * 2.5 * u[1]], quer(r1, s), quer(r2, s)];
  return { typ: 'blatt', aussen: mk(1), innen: mk(-1) };
}
function startStrich(p0, p1, enden, c1, c2) { return { typ: 'strich', p: [p0, c1 || lerp(p0, p1, 1 / 3), c2 || lerp(p0, p1, 2 / 3), p1], w: [4.2, 4.2, 4.2, 4.2, 4.2], enden, spitze: [4, 4] }; }
const dreieck = (c, r = 2.6) => ({ typ: 'knoten', p: [[c[0] - r, c[1] - r], [c[0] + r, c[1] - r], [c[0], c[1] + r]] });
function startLogo() { const n = N0;
  return { region: [208, 138, 102, 182], teile: {
    'blatt-mitte': startBlatt(n.B, n.T, [251.375, 218.25], [230.5, 190.875], [262.5, 219.25], [286, 193]),
    'blatt-links': startBlatt(n.LB, n.LT, [225.5, 248.25], [210.625, 221.625], [249.75, 222.25], [239.25, 200.375]),
    'blatt-rechts': startBlatt(n.RB, n.RTt, [290.5, 245.625], [303.875, 222.25], [264.25, 223.25], [279.25, 198.125]),
    'mittelrippe': startStrich(n.RT, n.B, ['spitz', 'stumpf']),
    'seitenrippe-links': startStrich(n.LR, n.LB, ['spitz', 'stumpf']),
    'seitenrippe-rechts': startStrich(n.RR, n.RB, ['spitz', 'stumpf']),
    'stiel': startStrich(n.B, [n.SB[0], n.SB[1] + 2], ['stumpf', 'gerade']),
    'seitenzweig-links': startStrich(n.J, n.LB, ['stumpf', 'stumpf']),
    'seitenzweig-rechts': startStrich(n.J, n.RB, ['stumpf', 'stumpf']),
    'knoten-mitte': dreieck(n.B), 'knoten-gabel': dreieck(n.J), 'knoten-links': dreieck(n.LB, 2), 'knoten-rechts': dreieck(n.RB, 2),
  } };
}

// ---------- Geometrie -> Umrisse ----------
function bz(p, t) { const [a, b, c, d] = p, u = 1 - t; const k0 = u * u * u, k1 = 3 * u * u * t, k2 = 3 * u * t * t, k3 = t * t * t;
  return [k0 * a[0] + k1 * b[0] + k2 * c[0] + k3 * d[0], k0 * a[1] + k1 * b[1] + k2 * c[1] + k3 * d[1]]; }
// Strich variabler Breite -> Polygon (links vorwaerts, rechts rueckwaerts)
function strichPoly(s, n = 96) {
  const c = []; for (let i = 0; i <= n; i++) c.push(bz(s.p, i / n));
  const d = [0]; for (let i = 1; i <= n; i++) d.push(d[i - 1] + Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1])); const len = d[n];
  const li = [], re = [];
  for (let i = 0; i <= n; i++) { const t = i / n, a = c[Math.max(0, i - 1)], b = c[Math.min(n, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], tn = Math.hypot(tx, ty) || 1;
    const k = Math.min(3, Math.floor(t * 4)), f = t * 4 - k; let w = s.w[k] + (s.w[k + 1] - s.w[k]) * f;
    if (s.enden[0] === 'spitz' && d[i] < s.spitze[0]) w *= d[i] / s.spitze[0];
    if (s.enden[1] === 'spitz' && len - d[i] < s.spitze[1]) w *= (len - d[i]) / s.spitze[1];
    const nx = -ty / tn * w / 2, ny = tx / tn * w / 2; li.push([c[i][0] + nx, c[i][1] + ny]); re.push([c[i][0] - nx, c[i][1] - ny]); }
  return [...li, ...re.reverse()];
}
const blattSeiten = l => [[l[0], l[1], l[2], l[3]], [l[0], l[4], l[5], l[3]]]; // Basis -> Spitze, links und rechts
function teilD(t, P) {
  if (t.typ === 'blatt') return [t.aussen, t.innen].map(l => `M${P(l[0])}C${P(l[1])} ${P(l[2])} ${P(l[3])}C${P(l[5])} ${P(l[4])} ${P(l[0])}Z`).join('');
  const poly = t.typ === 'strich' ? strichPoly(t) : t.p; return 'M' + poly.map(P).join('L') + 'Z';
}
function pfadElemente(geo, farbe, ox = 0, oy = 0) {
  const f = v => (Math.round(v * 1000) / 1000).toString(), P = p => f(p[0] - ox) + ' ' + f(p[1] - oy);
  return Object.values(geo.teile).map(t => `<path${t.typ === 'blatt' ? ' fill-rule="evenodd"' : ''} d="${teilD(t, P)}"/>`).join('');
}
const matrix = m => `matrix(${m.map(v => (Math.round(v * 1e6) / 1e6).toString()).join(' ')})`;
// Rendern in Referenzkoordinaten (Region); sw nur fuer die alte Strichform (zeichen-oben T-20261019-02)
function svgRegion(geo, sw, region, farbe = '#ffffff') { const [x0, y0, w, h] = region;
  const kopf = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}" preserveAspectRatio="none" width="${w}" height="${h}">`;
  if (!geo.teile) return kopf + `<path d="${pfadAlt(geo)}" fill="none" stroke="${farbe}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return kopf + `<g fill="${farbe}"${geo.passung ? ` transform="${matrix(geo.passung)}"` : ''}>${pfadElemente(geo, farbe)}</g></svg>`; }
async function druckSignal(geo, sw) { const [, , w, h] = geo.region; const r = await L.renderSVG(svgRegion(geo, sw, geo.region), w, h); const m = new Float32Array(w * h); for (let k = 0; k < w * h; k++) m[k] = r.d[k * 4 + 3] / 255; return { w, h, m, at: (x, y) => { const i = Math.round(x - geo.region[0] - 0.5), j = Math.round(y - geo.region[1] - 0.5); return i < 0 || j < 0 || i >= w || j >= h ? 0 : m[j * w + i]; } }; }
// alte Strichform (nur noch fuer ein unveraendertes zeichen-oben)
function pfadAlt(geo, ox = 0, oy = 0) { const f = v => (Math.round(v * 1000) / 1000).toString(); const P = p => f(p[0] - ox) + ' ' + f(p[1] - oy);
  return geo.curves.map(([a, b, c1, c2]) => 'M' + P(geo.nodes[a]) + (c1 ? 'C' + P(c1) + ' ' + P(c2) + ' ' : 'L') + P(geo.nodes[b])).join(''); }
function ptsAlt(geo, n = 40) { return geo.curves.map(([a, b, c1, c2]) => { const o = []; for (let i = 0; i <= n; i++) o.push(c1 ? bz([geo.nodes[a], c1, c2, geo.nodes[b]], i / n) : lerp(geo.nodes[a], geo.nodes[b], i / n)); return o; }); }

// ---------- Messung ----------
// Helligkeitssignal der Referenz (Luma Y = 0,299 R + 0,587 G + 0,114 B), normiert auf den 30-%- bis 99,5-%-Wert der Region.
// Seit T-20261021-16 gewertet (L2, L3) und Grundlage der Anpassung; R-B (signal) nur noch Info und Bandzeichen.
function signalY(img, region) { const [x0, y0, w, h] = region, v = []; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const k = (y * img.w + x) * 3; v.push(L.lum(img.d[k], img.d[k + 1], img.d[k + 2])); }
  const s = [...v].sort((a, b) => a - b), lo = s[Math.floor(s.length * 0.3)], hi = s[Math.floor(s.length * 0.995)]; return { map: { w, h, m: Float32Array.from(v.map(q => Math.max(0, (q - lo) / (hi - lo)))) } }; }
// Goldsignal der Referenz (R-B), normiert auf den 99,5-%-Wert der Region (unveraendert seit T-20261019-02; nur Info)
function signal(img, region) {
  const [x0, y0, w, h] = region; const s = (x, y) => { const o = [0, 0, 0]; L.sampleBicubic(img, x, y, o, 0); return o[0] - o[2]; };
  const vals = []; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) vals.push(s(x, y)); const srt = [...vals].sort((a, b) => a - b);
  const lo = srt[Math.floor(srt.length * 0.3)], hi = srt[Math.floor(srt.length * 0.995)];
  return { at: (x, y) => Math.max(0, Math.min(1.2, (s(x, y) - lo) / (hi - lo))), map: { w, h, m: Float32Array.from(vals.map(v => Math.max(0, (v - lo) / (hi - lo)))) } };
}
function bilAt(map, region) { return (x, y) => { const fx = x - region[0] - 0.5, fy = y - region[1] - 0.5, { w, h, m } = map; const xa = Math.max(0, Math.min(w - 2, Math.floor(fx))), ya = Math.max(0, Math.min(h - 2, Math.floor(fy))), tx = Math.min(1, Math.max(0, fx - xa)), ty = Math.min(1, Math.max(0, fy - ya));
  return (m[ya * w + xa] * (1 - tx) + m[ya * w + xa + 1] * tx) * (1 - ty) + (m[(ya + 1) * w + xa] * (1 - tx) + m[(ya + 1) * w + xa + 1] * tx) * ty; }; }
// Querschnittsbreite (50 % zwischen Grund und Spitze) an Punkt p quer zur Richtung (dx, dy); null, wenn nicht eindeutig
function querbreite(at, p, dx, dy) { const n = Math.hypot(dx, dy), nx = -dy / n, ny = dx / n; const prof = []; for (let t = -5; t <= 5.001; t += 0.1) prof.push(at(p[0] + nx * t, p[1] + ny * t));
  const pk = Math.max(...prof.slice(30, 71)), base = Math.min(Math.min(...prof.slice(0, 15)), Math.min(...prof.slice(86))); const T = base + (pk - base) / 2;
  let a = 50, b = 50; while (a > 0 && prof[a] >= T) a--; while (b < prof.length - 1 && prof[b] >= T) b++; return a > 0 && b < prof.length - 1 ? (b - a) * 0.1 : null; }
// Mittellinien je Teil (fuer die Strichstaerke): Blattumriss = Mitte zwischen aeusserer und innerer Linse
function mittellinien(geo) { const out = {};
  for (const [k, t] of Object.entries(geo.teile)) {
    if (t.typ === 'blatt') { const A = blattSeiten(t.aussen), I = blattSeiten(t.innen); out[k] = [0, 1].map(s => { const o = []; for (let i = 0; i <= 40; i++) { const a = bz(A[s], i / 40), b = bz(I[s], i / 40); o.push(lerp(a, b, 0.5)); } return o; }); }
    else if (t.typ === 'strich') { const o = []; for (let i = 0; i <= 40; i++) o.push(bz(t.p, i / 40)); out[k] = [o]; } }
  return out; }
// Strichstaerke je Teil: Median der Querschnittsbreiten, Kurvenstellen t in [lo, hi] (Abstand zu Verzweigungen und Enden)
const BEREICH = { 'blatt-mitte': [0.2, 0.8], 'blatt-links': [0.25, 0.8], 'blatt-rechts': [0.25, 0.8], 'mittelrippe': [0.2, 0.75], 'seitenrippe-links': [0.25, 0.7], 'seitenrippe-rechts': [0.25, 0.7],
  'stiel': [0.1, 0.9], 'seitenzweig-links': [0.2, 0.8], 'seitenzweig-rechts': [0.2, 0.8] };
function strichstaerkeTeile(geo, at) { const ml = mittellinien(geo), out = {};
  for (const [k, linien] of Object.entries(ml)) { const [lo, hi] = BEREICH[k] || [0.2, 0.8]; const v = [];
    for (const c of linien) for (let i = Math.ceil(lo * 40); i <= hi * 40; i++) { const a = c[Math.max(0, i - 1)], b = c[Math.min(40, i + 1)], q = querbreite(at, c[i], b[0] - a[0], b[1] - a[1]); if (q !== null) v.push(q); }
    v.sort((p, q) => p - q); const m = v.slice(Math.floor(v.length * 0.2), Math.ceil(v.length * 0.8)); // mittel: getrimmt (20-80 %), nur fuer die Anpassung
    out[k] = { median: v[Math.floor(v.length / 2)], mittel: m.reduce((a, b) => a + b, 0) / Math.max(1, m.length), n: v.length }; }
  return out; }
// Umrissabweichung: Kanten der Masken (bilinear s-fach, Schwelle fa bzw. fb x 99,5-%-Wert; K7: 0,5 und 4x), symmetrischer Abstand, Referenzpixel
function umriss(mapA, mapB, fa = 0.5, fb = 0.5, s = 4, mitPunkten = false) {
  const A = M.upWin(mapA, [0, 1, 0, 1], s), B = M.upWin(mapB, [0, 1, 0, 1], s); const W = A.W, H = A.H; const TA = A.T * fa / 0.5, TB = B.T * fb / 0.5;
  const ma = A.o.map(v => v >= TA ? 1 : 0), mb = B.o.map(v => v >= TB ? 1 : 0);
  const edges = m => { const e = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const k = y * W + x; if (m[k] && (!m[k - 1] || !m[k + 1] || !m[k - W] || !m[k + W])) e.push([x, y]); } return e; };
  const ea = edges(ma), eb = edges(mb); const grid = e => { const g = new Map(); for (const p of e) { const key = (p[0] >> 4) + ',' + (p[1] >> 4); if (!g.has(key)) g.set(key, []); g.get(key).push(p); } return g; };
  const ga = grid(ea), gb = grid(eb);
  const near = (p, g) => { let best = Infinity; for (let r = 0; r < 6 && best > r * 16 - 16; r++) for (let gx = (p[0] >> 4) - r; gx <= (p[0] >> 4) + r; gx++) for (let gy = (p[1] >> 4) - r; gy <= (p[1] >> 4) + r; gy++) { if (Math.max(Math.abs(gx - (p[0] >> 4)), Math.abs(gy - (p[1] >> 4))) !== r) continue; for (const q of g.get(gx + ',' + gy) || []) best = Math.min(best, Math.hypot(q[0] - p[0], q[1] - p[1])); } return best; };
  const dp = [...eb.map(p => [near(p, ga) / s, p]), ...ea.map(p => [near(p, gb) / s, p])]; const d = dp.map(v => v[0]).sort((p, q) => p - q);
  const r = { max: d[d.length - 1], p95: d[Math.floor(d.length * 0.95)], mittel: d.reduce((a, v) => a + v, 0) / d.length, n: d.length };
  if (mitPunkten) r.punkte = dp.filter(v => v[0] > r.p95).map(([v, p]) => [v, (p[0] + 0.5) / s, (p[1] + 0.5) / s]); // Lage in Regionspixeln
  return r;
}

// ---------- Anpassung ----------
function griffe(geo, mitAnpassung = true) { const g = []; const P = (o, i, st, mn = -Infinity) => g.push({ v: () => o[i], s: x => { o[i] = x; }, st, mn });
  const pt = (p, st = 1) => { P(p, 0, st); P(p, 1, st); };
  for (const t of Object.values(geo.teile)) {
    if (t.typ === 'blatt') { [...t.aussen, ...t.innen].forEach(p => pt(p)); const z = { d: 0 }; // Gruppengriff Umrissbreite
      g.push({ v: () => z.d, s: x => { dickeBlatt(t, x - z.d); z.d = x; }, st: 0.5, mn: -Infinity }); }
    else if (t.typ === 'knoten') t.p.forEach(p => pt(p, 0.5));
    else { t.p.forEach(p => pt(p)); t.w.forEach((_, i) => P(t.w, i, 0.5, 0.4)); const mw = () => t.w.reduce((a, b) => a + b, 0) / 5; // Gruppengriff Strichbreite
      g.push({ v: mw, s: x => { const dd = x - mw(); for (let i = 0; i < 5; i++) t.w[i] += dd; }, st: 0.5, mn: 0.8 });
      t.enden.forEach((e, i) => { if (e === 'spitz') P(t.spitze, i, 1, 0.5); }); } }
  if (mitAnpassung && geo.passung) geo.passung.forEach((_, i) => P(geo.passung, i, i < 4 ? 0.01 : 0.5));
  return g; }
// Umrissbreite eines Blatts: Kontrollpunkte der aeusseren Linse nach aussen, der inneren nach innen (quer zur Achse)
function dickeBlatt(t, dd) { const B = t.aussen[0], T = t.aussen[3], n = Math.hypot(T[0] - B[0], T[1] - B[1]), u = [(T[0] - B[0]) / n, (T[1] - B[1]) / n], mid = lerp(B, T, 0.5);
  for (const [l, sg] of [[t.aussen, 1], [t.innen, -1]]) for (const i of [1, 2, 4, 5]) { const p = l[i], s = Math.sign((p[0] - mid[0]) * -u[1] + (p[1] - mid[1]) * u[0]) || 1; p[0] += sg * s * dd * -u[1]; p[1] += sg * s * dd * u[0]; } }
function weich(map, s, T, k) { const { w, h, m } = map, W = w * s, H = h * s, o = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const fx = (x + 0.5) / s - 0.5, fy = (y + 0.5) / s - 0.5; const xa = Math.max(0, Math.min(w - 2, Math.floor(fx))), ya = Math.max(0, Math.min(h - 2, Math.floor(fy))), tx = Math.min(1, Math.max(0, fx - xa)), ty = Math.min(1, Math.max(0, fy - ya));
    const v = (m[ya * w + xa] * (1 - tx) + m[ya * w + xa + 1] * tx) * (1 - ty) + (m[(ya + 1) * w + xa] * (1 - tx) + m[(ya + 1) * w + xa + 1] * tx) * ty; o[y * W + x] = 0.5 + 0.5 * Math.tanh((v - T) / k); }
  return o; }
// Koordinatenabstieg; kosten(geo) -> Zahl (kleiner = besser)
async function abstieg(geo, kosten, schritte, runden = 15, mitAnpassung = true) { const G = griffe(geo, mitAnpassung); let best = await kosten(geo);
  for (const st of schritte) for (let it = 0; it < runden; it++) { let imp = false;
    for (const h of G) for (const dl of [st * h.st, -st * h.st]) { const alt = h.v(), neu = Math.max(h.mn, alt + dl); if (neu === alt) continue; h.s(neu); const c = await kosten(geo); if (c < best - 1e-9) { best = c; imp = true; break; } h.s(alt); }
    if (!imp) break; }
  return best; }
function weicheKosten(Sref, region, s = 2, k = 0.05) { const A = M.upWin(Sref, [0, 1, 0, 1], s), ref = weich(Sref, s, A.T, k); const [, , w, h] = region;
  return async geo => { const r = await L.renderSVG(svgRegion(geo, 0, region), w, h); const m = new Float32Array(w * h); for (let q = 0; q < w * h; q++) m[q] = r.d[q * 4 + 3] / 255;
    const p = weich({ w, h, m }, s, 0.5, k); let c = 0; for (let q = 0; q < p.length; q++) { const d = p[q] - ref[q]; c += d * d; } return c / (s * s); }; }
function umrissKosten(Sref, region, s = 4) { return async geo => { const D = await druckSignal(geo, 0); const u = umriss(Sref, D, 0.5, 0.5, s); return u.p95 + 0.5 * u.max + u.mittel; }; }
// sichtbarer Beitrag eines Knotens: Deckung mit minus ohne ihn (Referenzpixel^2)
async function beitrag(geo, name, D) { D = D || await druckSignal(geo, 0); const ohne = { ...geo, teile: { ...geo.teile } }; delete ohne.teile[name]; const E = await druckSignal(ohne, 0); let s = 0; for (let k = 0; k < D.m.length; k++) s += D.m[k] - E.m[k]; return s; }
async function knotenStrafe(geo, D, min = 2) { let c = 0; for (const [k, t] of Object.entries(geo.teile)) if (t.typ === 'knoten') c += Math.max(0, min - await beitrag(geo, k, D)); return c; }
// L2 + L3 + Knoten gemeinsam: Umriss (mit Schranken p95 0,7 / Max 1,4), Strichbreite je Teil (getrimmtes Mittel, Ziel |Abw.| <= 7 %), Knotenbeitrag >= 2 px^2
function gesamtKosten(Sref, region, refBreite, s = 4) { return async geo => { const D = await druckSignal(geo, 0), u = umriss(Sref, D, 0.5, 0.5, s);
  let c = u.p95 + 0.5 * u.max + u.mittel + 5 * Math.max(0, u.p95 - 0.7) + 5 * Math.max(0, u.max - 1.4);
  if (refBreite) { const sd = strichstaerkeTeile(geo, bilAt(D, region)); for (const k in refBreite) c += 10 * Math.max(0, Math.abs(sd[k].mittel / refBreite[k] - 1) - 0.07); }
  return c + 2 * await knotenStrafe(geo, D); }; }
const runden3 = o => JSON.parse(JSON.stringify(o, (k, v) => typeof v === 'number' ? +v.toFixed(3) : v));
async function anpassenLogo(log = console.log) {
  const img = await L.loadRGB(L.refPath()); const geo = startLogo(); const S = signalY(img, geo.region).map, weichK = weicheKosten(S, geo.region);
  let c = await abstieg(geo, async g => (await weichK(g)) + 20 * await knotenStrafe(g), [1, 0.5, 0.25, 0.125], 20); log('weich', c.toFixed(2));
  c = await abstieg(geo, gesamtKosten(S, geo.region, null), [0.25, 0.125, 0.0625], 8); log('umriss', c.toFixed(3));
  const sr = strichstaerkeTeile(geo, bilAt(S, geo.region)), ref = Object.fromEntries(Object.entries(sr).map(([k, v]) => [k, v.mittel]));
  c = await abstieg(geo, gesamtKosten(S, geo.region, ref), [0.25, 0.125, 0.0625], 8); log('gesamt', c.toFixed(3));
  const D = await druckSignal(geo, 0); geo.umriss = umriss(S, D);
  const sr2 = strichstaerkeTeile(geo, bilAt(S, geo.region)), sd = strichstaerkeTeile(geo, bilAt(D, geo.region));
  geo.strichTeile = Object.fromEntries(Object.keys(sr2).map(k => [k, { ref: sr2[k].median, druck: sd[k].median }]));
  geo.strich = sd['stiel'].median; // nur Info (build.cjs gibt es als stroke-width aus)
  return runden3(geo);
}
// Nachschaerfen (zweiter Aufruf nach "anpassen"): von logo-werte.json aus, Schranken L2 und L3 streng gewichtet
function strengeKosten(Sref, region, ref) { return async geo => { const D = await druckSignal(geo, 0), u = umriss(Sref, D, 0.5, 0.5, 4), sd = strichstaerkeTeile(geo, bilAt(D, region));
  let c = u.p95 + 0.5 * u.max + u.mittel + 20 * Math.max(0, u.p95 - 0.7) + 20 * Math.max(0, u.max - 1.4);
  for (const k in ref) c += 20 * Math.max(0, Math.abs(sd[k].mittel / ref[k].mittel - 1) - 0.06) + 20 * Math.max(0, Math.abs(sd[k].median / ref[k].median - 1) - 0.07);
  return c + 2 * await knotenStrafe(geo, D); }; }
// Vorstufe: Strichbreite je Teil auf die Referenz-Halbwertsbreite (Median) ziehen, solange ein Teil > 8 % abweicht
async function breitenAngleich(geo, ref, log, runden = 5) { for (let r = 0; r < runden; r++) { const D = await druckSignal(geo, 0), sd = strichstaerkeTeile(geo, bilAt(D, geo.region)); let mx = 0;
  for (const k in ref) mx = Math.max(mx, Math.abs(sd[k].median / ref[k].median - 1)); log('Breitenangleich', r, 'max. Abweichung', (100 * mx).toFixed(1) + ' %'); if (mx < 0.08) return;
  for (const k in ref) { const t = geo.teile[k], q = ref[k].median / sd[k].median; if (!t) continue;
    if (t.typ === 'blatt') dickeBlatt(t, 0.6 * (ref[k].median - sd[k].median)); else if (t.w) for (let i = 0; i < t.w.length; i++) t.w[i] = Math.max(0.4, t.w[i] * q); } } }
// Vorstufe 2: spitze Strichenden entlang der Tangente verschieben (Y zeigt die Seitenrippenspitzen bis 4 px laenger als der Druck)
async function endenAngleich(geo, K, log, passes = 2) { const E = [0, -1, -0.5, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]; for (let r = 0; r < passes; r++) for (const [name, t] of Object.entries(geo.teile)) { if (t.typ !== 'strich' || !t.enden) continue;
  for (const i of [0, 1]) { if (t.enden[i] !== 'spitz') continue; const P = t.p[i ? 3 : 0], Q = t.p[i ? 2 : 1], n = Math.hypot(P[0] - Q[0], P[1] - Q[1]), u = [(P[0] - Q[0]) / n, (P[1] - Q[1]) / n], b = [P[0], P[1]]; let be = 0, bc = Infinity;
    for (const e of E) { P[0] = b[0] + e * u[0]; P[1] = b[1] + e * u[1]; const c = await K(geo); if (c < bc - 1e-9) { bc = c; be = e; } }
    P[0] = b[0] + be * u[0]; P[1] = b[1] + be * u[1]; log('Ende', name, i, 'verschoben', be, 'Kosten', bc.toFixed(3)); } } }
async function nachschaerfen(geo0, log = console.log) { const img = await L.loadRGB(L.refPath()), geo = { region: geo0.region, teile: JSON.parse(JSON.stringify(geo0.teile)) }, S = signalY(img, geo.region).map;
  const ref = strichstaerkeTeile(geo, bilAt(S, geo.region)); await breitenAngleich(geo, ref, log);
  const frist = Date.now() + 60000 * (+process.env.LOGO_MINUTEN || 20), K = strengeKosten(S, geo.region, ref); let n = 0; // Frist: nach Ablauf wird jeder Versuch verworfen, der beste Stand bleibt
  await endenAngleich(geo, K, log);
  const c = await abstieg(geo, async g => { if (Date.now() > frist) return Infinity; n++; return K(g); }, (process.env.LOGO_SCHRITTE ? process.env.LOGO_SCHRITTE.split(',').map(Number) : [0.125, 0.0625, 0.03125]), 10); log('streng', c.toFixed(3), 'Auswertungen', n, Date.now() > frist ? 'Frist erreicht' : 'konvergiert');
  const D = await druckSignal(geo, 0); geo.umriss = umriss(S, D); const sd = strichstaerkeTeile(geo, bilAt(D, geo.region));
  geo.strichTeile = Object.fromEntries(Object.keys(ref).map(k => [k, { ref: ref[k].median, druck: sd[k].median }])); geo.strich = sd['stiel'].median; return runden3(geo); }
async function anpassenAlle(modus) { const W = JSON.parse(fs.readFileSync(path.join(__dirname, 'logo-werte.json'), 'utf8'));
  W['logo-band'] = modus === 'nachschaerfen' ? await nachschaerfen(W['logo-band']) : await anpassenLogo(); fs.writeFileSync(path.join(__dirname, 'logo-werte.json'), JSON.stringify(W, null, 1));
  console.log('logo-band Umriss', JSON.stringify(W['logo-band'].umriss), 'Strich', JSON.stringify(W['logo-band'].strichTeile)); }

// ---------- Ausgaben ----------
function grenzen(geo) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; const add = ([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  for (const t of Object.values(geo.teile)) { if (t.typ === 'blatt') for (const l of [t.aussen]) for (const s of blattSeiten(l)) for (let i = 0; i <= 80; i++) add(bz(s, i / 80)); else (t.typ === 'strich' ? strichPoly(t) : t.p).forEach(add); }
  return [x0, y0, x1, y1]; }
// fertige SVG-Datei: viewBox um das Zeichen (Rand 0,5 Referenzpixel), Einheit = Referenzpixel, nur fill
function logoSVG(o, farbe) { const f = v => (Math.round(v * 1000) / 1000).toString();
  if (!o.teile) { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const c of ptsAlt(o, 60)) for (const [x, y] of c) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const m = o.strich / 2 + 0.5; x0 -= m; y0 -= m; x1 += m; y1 += m; const w = x1 - x0, h = y1 - y0;
    return { w, h, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(w)} ${f(h)}" width="${f(w)}" height="${f(h)}"><path d="${pfadAlt(o, x0, y0)}" fill="none" stroke="${farbe}" stroke-width="${o.strich}" stroke-linecap="round" stroke-linejoin="round"/></svg>` }; }
  let [x0, y0, x1, y1] = grenzen(o); x0 -= 0.5; y0 -= 0.5; x1 += 0.5; y1 += 0.5; const w = x1 - x0, h = y1 - y0;
  return { w, h, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(w)} ${f(h)}" width="${f(w)}" height="${f(h)}"><g fill="${farbe}">${pfadElemente(o, farbe, x0, y0)}</g></svg>` };
}
// Ausgaben: SVG (Einheit Referenzpixel, nur fill) und PNG (Gold auf transparent). logo-band Hoehe 2048 px;
// zeichen-oben lange Seite 2048 px (neues Zeichen = Blattlogo in Draufsicht) bzw. Hoehe 512 px (alte Strichform)
async function schreiben(labelDir, assetsDir, hLogo = 2048, langZeichen = 2048) {
  const W = JSON.parse(fs.readFileSync(path.join(__dirname, 'logo-werte.json'), 'utf8'));
  const farbe = L.hex(L.C.PAPIER.map((p, c) => p * L.C.VERHAELTNIS.logo[c])); const out = {};
  for (const name of ['logo-band', 'zeichen-oben']) {
    const o = W[name]; // zeichen-oben neu: eigene Kopie der Teile + passung (nur Pruefung); Ausgabe ohne passung = Draufsicht
    const { w, h, svg } = logoSVG(o, farbe); fs.mkdirSync(labelDir, { recursive: true }); fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(path.join(labelDir, name + '.svg'), svg + '\n');
    let H, Wp; if (name === 'logo-band') { H = hLogo; Wp = Math.round(H * w / h); } else if (o.teile) { const s = langZeichen / Math.max(w, h); H = Math.round(h * s); Wp = Math.round(w * s); } else { H = 512; Wp = Math.round(H * w / h); }
    const r = await L.renderSVG(svg, Wp, H);
    await L.sharp(Buffer.from(r.d.buffer || r.d), { raw: { width: r.w, height: r.h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(assetsDir, name + '.png'));
    out[name] = { w: Wp, h: H, farbe };
  }
  return out;
}
module.exports = { startLogo, signalY, schreiben, logoSVG, svgRegion, druckSignal, signal, bilAt, umriss, querbreite, strichstaerkeTeile, mittellinien, strichPoly, bz, blattSeiten, abstieg, weicheKosten, umrissKosten, gesamtKosten, beitrag, knotenStrafe, griffe, runden3, grenzen };
if (require.main === module && ['anpassen', 'nachschaerfen'].includes(process.argv[2])) anpassenAlle(process.argv[2]);
