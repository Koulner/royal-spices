'use strict';
// Pruefungen Blattlogo und Bandzeichen (L1-L5), Ergebnis in <pruefordner>: logo-messung.md, logo-details.png, zeichen-oben-fit.png
// Aufruf:  node logo-pruefen.cjs <pruefordner>           Tabellen und Bilder aus logo-werte.json
//          node logo-pruefen.cjs <pruefordner> zeichen   vorher Bandzeichen-Ausgleich (L4) rechnen und in logo-werte.json eintragen
// Messverfahren wie K7 (Signal seit T-20261021-16 Luma Y, logo.cjs signalY; R-B nur Info; 50-%-Masken, bilinear, symmetrischer Kantenabstand); Bandzeichen 8x.
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const M = require('./messen.cjs');
const LOGO = require('./logo.cjs');
const WERTE = path.join(__dirname, 'logo-werte.json');
const ZR = [232, 32, 70, 17], BAND = [0x24, 0x27, 0x13], MM_PRO_PX = 52.7 / 448.6;
const f = (v, n = 2) => (typeof v === 'number' ? v.toFixed(n) : String(v)).replace(/\./g, ',');

// ---------- L4: Blattlogo per Ausgleich an das Bandzeichen ----------
const zentrum = g => { const [x0, y0, x1, y1] = LOGO.grenzen(g); return [(x0 + x1) / 2, (y0 + y1) / 2]; };
const voll = (p, C) => [p[0], p[1], p[2], p[3], p[4] - p[0] * C[0] - p[2] * C[1], p[5] - p[1] * C[0] - p[3] * C[1]]; // [a b c d e f] um C zentriert -> SVG-Matrix
async function ausgleich(logo, img, richtung) {
  const S = LOGO.signalY(img, ZR).map, C = zentrum(logo), sg = richtung === 'stiel-vorn' ? 1 : -1; // stiel-hinten = 180 Grad gedreht
  const geo = { region: ZR, teile: logo.teile }; const weich = LOGO.weicheKosten(S, ZR, 8), streng = LOGO.umrissKosten(S, ZR, 8);
  const kost = K => async p => { geo.passung = voll(p, C); return K(geo); };
  const schritt = [0.005, 0.002, 0.01, 0.002, 0.25, 0.25]; let best = null;
  for (const a of [0.55, 0.65, 0.75]) for (const d of [0.06, 0.09, 0.13]) {
    const p = [sg * a, 0, 0, sg * d, 267, 40.5]; let c = await kost(weich)(p);
    for (const st of [4, 2, 1, 0.5]) for (let it = 0; it < 20; it++) { let imp = false;
      for (let i = 0; i < 6; i++) for (const dl of [st * schritt[i], -st * schritt[i]]) { p[i] += dl; const cc = await kost(weich)(p); if (cc < c - 1e-9) { c = cc; imp = true; break; } p[i] -= dl; }
      if (!imp) break; }
    if (!best || c < best.c) best = { c, p: [...p] }; }
  const p = best.p; let c = await kost(streng)(p);
  for (const st of [1, 0.5, 0.25]) for (let it = 0; it < 10; it++) { let imp = false;
    for (let i = 0; i < 6; i++) for (const dl of [st * schritt[i], -st * schritt[i]]) { p[i] += dl; const cc = await kost(streng)(p); if (cc < c - 1e-9) { c = cc; imp = true; break; } p[i] -= dl; }
    if (!imp) break; }
  geo.passung = voll(p, C); const D = await LOGO.druckSignal(geo, 0); const u = LOGO.umriss(S, D, 0.5, 0.5, 8), uRB = LOGO.umriss(LOGO.signal(img, ZR).map, D, 0.5, 0.5, 8); // R-B nur Info
  const s = Math.hypot(p[0], p[1]), k = Math.abs(p[0] * p[3] - p[1] * p[2]) / (s * s); // Massstab (Breite) und senkrechte Stauchung
  return { richtung, zentrierteParameter: p.map(v => +v.toFixed(5)), passung: voll(p, C).map(v => +v.toFixed(5)), massstab: +s.toFixed(4), k: +k.toFixed(4),
    drehungGrad: +(Math.atan2(p[1], p[0]) * 180 / Math.PI * sg).toFixed(2), lage: [+p[4].toFixed(2), +p[5].toFixed(2)], umriss8: LOGO.runden3(u), umriss8RB: LOGO.runden3(uRB) };
}
// L4 seit T-20261021-18: Ausgleich und Vergleich auf Luma Y (wie L2); das heutige Zeichen wird mit demselben Verfahren gemessen (umriss 50 %, 8x) -> p95_alt; R-B nur Info
async function zeichenRechnen(img) {
  const W = JSON.parse(fs.readFileSync(WERTE, 'utf8')); const logo = W['logo-band'];
  const { pruefung: _p, umriss8: _u, umriss8RB: _r, ...alt } = W['zeichen-oben'].teile ? W['zeichen-oben'].pruefung.alt : W['zeichen-oben']; // Stand T-10 ohne fruehere Pruefwerte -> wiederholbar
  const Dalt = await LOGO.druckSignal(alt, alt.strich), uAlt = LOGO.umriss(LOGO.signalY(img, ZR).map, Dalt, 0.5, 0.5, 8), uAltRB = LOGO.umriss(LOGO.signal(img, ZR).map, Dalt, 0.5, 0.5, 8);
  const pr = { alt: { ...alt, umriss8: LOGO.runden3(uAlt), umriss8RB: LOGO.runden3(uAltRB) } }; console.log('alt', JSON.stringify(pr.alt.umriss8));
  for (const r of ['stiel-vorn', 'stiel-hinten']) { pr[r] = await ausgleich(logo, img, r); console.log(r, JSON.stringify(pr[r].umriss8), 'k', pr[r].k, 's', pr[r].massstab); }
  const bestR = pr['stiel-vorn'].umriss8.p95 <= pr['stiel-hinten'].umriss8.p95 ? 'stiel-vorn' : 'stiel-hinten', q = pr[bestR], p95Alt = pr.alt.umriss8.p95, besser = q.umriss8.p95 < p95Alt;
  W['zeichen-oben'] = besser ? { region: ZR, draufsicht: true, ausrichtung: bestR, massstab: q.massstab, k: q.k, drehungGrad: q.drehungGrad, lage: q.lage, passung: q.passung, teile: logo.teile, strich: logo.strich, umriss: q.umriss8, pruefung: pr }
    : { ...alt, pruefung: pr };
  fs.writeFileSync(WERTE, JSON.stringify(W, null, 1)); console.log('zeichen-oben', besser ? 'neu: Blattlogo in Draufsicht, ' + bestR : 'unveraendert', 'p95_alt', p95Alt, 'p95_neu', q.umriss8.p95);
}

// ---------- Bilder ----------
const png = (b, w, h, ch) => L.sharp(Buffer.from(b), { raw: { width: w, height: h, channels: ch } }).png();
function cropRGB(img, r, s) { const [x0, y0, w, h] = r; const b = new Uint8Array(w * h * 3); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) for (let c = 0; c < 3; c++) b[(j * w + i) * 3 + c] = img.d[((y0 + j) * img.w + x0 + i) * 3 + c];
  return png(b, w, h, 3).resize(w * s, h * s, { kernel: 'nearest' }).toBuffer(); }
async function druckRGB(geo, r, s, farbe) { const W = r[2] * s, H = r[3] * s, q = await L.renderSVG(LOGO.svgRegion(geo, geo.strich, r, farbe), W, H), b = new Uint8Array(W * H * 3);
  for (let k = 0; k < W * H; k++) { const a = q.d[k * 4 + 3] / 255; for (let c = 0; c < 3; c++) b[k * 3 + c] = Math.round(a * q.d[k * 4 + c] + (1 - a) * BAND[c]); } return png(b, W, H, 3).toBuffer(); }
function overlay(A, B, x0, y0, W, H) { const b = new Uint8Array(W * H * 3); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = (y0 + y) * A.W + x0 + x, inn = x0 + x >= 0 && y0 + y >= 0 && x0 + x < A.W && y0 + y < A.H;
  const a = inn && A.o[k] >= A.T, c = inn && B.o[k] >= B.T; b.set(a && c ? [30, 30, 30] : a ? [225, 60, 50] : c ? [50, 110, 230] : [255, 255, 255], (y * W + x) * 3); } return png(b, W, H, 3).toBuffer(); }
const txt = (t, w, h = 22, fs_ = 14) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><text x="3" y="${h - 6}" font-family="Arial" font-size="${fs_}">${t}</text></svg>`);
async function bildDetails(file, img, geo, farbe, S, D) {
  const t = geo.teile, schwer = p => [(p[0][0] + p[1][0] + p[2][0]) / 3, (p[0][1] + p[1][1] + p[2][1]) / 3];
  const orte = [['Spitze Mittelblatt', t['blatt-mitte'].aussen[3]], ['Spitze Blatt links', t['blatt-links'].aussen[3]], ['Spitze Blatt rechts', t['blatt-rechts'].aussen[3]], ['Stielende', t['stiel'].p[3]],
    ['Knoten unter Mittelblatt', schwer(t['knoten-mitte'].p)], ['Knoten Gabel', schwer(t['knoten-gabel'].p)], ['Knoten Ansatz links', schwer(t['knoten-links'].p)], ['Knoten Ansatz rechts', schwer(t['knoten-rechts'].p)]];
  const s = 8, g = 16, P = g * s, gap = 4, bw = 3 * P + 2 * gap, A = M.upWin(S, [0, 1, 0, 1], s), B = M.upWin(D, [0, 1, 0, 1], s), comp = [];
  for (let n = 0; n < orte.length; n++) { const [name, c] = orte[n], x0 = Math.round(c[0] - g / 2), y0 = Math.round(c[1] - g / 2), r = [x0, y0, g, g], left = (n % 2) * (bw + 16), top = Math.floor(n / 2) * (P + 32);
    comp.push({ input: txt(`${name} (${f(c[0], 1)} / ${f(c[1], 1)}): Referenz | Druck | Masken`, bw), left, top },
      { input: await cropRGB(img, r, s), left, top: top + 22 }, { input: await druckRGB(geo, r, s, farbe), left: left + P + gap, top: top + 22 },
      { input: await overlay(A, B, (x0 - geo.region[0]) * s, (y0 - geo.region[1]) * s, P, P), left: left + 2 * (P + gap), top: top + 22 }); }
  const TW = 2 * bw + 16, TH = 4 * (P + 32) + 24; comp.push({ input: txt('Ausschnitte 16 x 16 Referenzpixel, 8x. Masken: rot = nur Referenz, blau = nur Druck, schwarz = beide (50 %, bilinear)', TW, 24, 13), left: 0, top: TH - 24 });
  await L.sharp({ create: { width: TW, height: TH, channels: 3, background: '#ffffff' } }).composite(comp).png({ compressionLevel: 9 }).toFile(file);
}
async function bildZeichen(file, img, W, farbe) { const s = 8, P = [ZR[2] * s, ZR[3] * s], gap = 8, S = LOGO.signalY(img, ZR).map, A = M.upWin(S, [0, 1, 0, 1], s), comp = []; let y = 0; const TW = 3 * P[0] + 2 * gap;
  const pr = W['zeichen-oben'].pruefung;
  for (const [name, geo] of [['heute (T-20261019-02, Strichform)', pr.alt], ['Blattlogo, Stiel vorn', { region: ZR, teile: W['logo-band'].teile, passung: pr['stiel-vorn'].passung }], ['Blattlogo, Stiel hinten', { region: ZR, teile: W['logo-band'].teile, passung: pr['stiel-hinten'].passung }]]) {
    const D = await LOGO.druckSignal(geo, geo.strich), u = LOGO.umriss(S, D, 0.5, 0.5, 8), B = M.upWin(D, [0, 1, 0, 1], s);
    comp.push({ input: txt(`${name}: Referenz | Druck | Masken (8x, Umriss p95 ${f(u.p95)} px, Max ${f(u.max)} px)`, TW), left: 0, top: y }); y += 22;
    comp.push({ input: await cropRGB(img, ZR, s), left: 0, top: y }, { input: await druckRGB(geo, ZR, s, farbe), left: P[0] + gap, top: y }, { input: await overlay(A, B, 0, 0, P[0], P[1]), left: 2 * (P[0] + gap), top: y }); y += P[1] + 10; }
  await L.sharp({ create: { width: TW, height: y, channels: 3, background: '#ffffff' } }).composite(comp).png({ compressionLevel: 9 }).toFile(file);
}

// ---------- L1, L3, L5 ----------
function winkel(a, T, b) { const u = [a[0] - T[0], a[1] - T[1]], v = [b[0] - T[0], b[1] - T[1]]; return Math.acos((u[0] * v[0] + u[1] * v[1]) / Math.hypot(...u) / Math.hypot(...v)) * 180 / Math.PI; }
async function knotenBeitrag(geo, name) { const [, , w, h] = geo.region, ohne = { ...geo, teile: { ...geo.teile } }; delete ohne.teile[name];
  const a = await LOGO.druckSignal(geo, 0), b = await LOGO.druckSignal(ohne, 0); let s = 0; for (let k = 0; k < w * h; k++) s += a.m[k] - b.m[k]; return s; }
function lumaMap(img, r) { const [x0, y0, w, h] = r, v = []; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const k = (y * img.w + x) * 3; v.push(L.lum(img.d[k], img.d[k + 1], img.d[k + 2])); }
  const s = [...v].sort((a, b) => a - b), lo = s[Math.floor(s.length * 0.3)], hi = s[Math.floor(s.length * 0.995)]; return { w, h, m: Float32Array.from(v.map(q => Math.max(0, (q - lo) / (hi - lo)))) }; }
async function farbePNG(file) { const { data, info } = await L.sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); let deck = 0, aus = 0, teil = 0, ausTeil = 0, transp = 0; const Z = [193, 156, 88];
  for (let k = 0; k < info.width * info.height; k++) { const a = data[k * 4 + 3], d = Math.max(...[0, 1, 2].map(c => Math.abs(data[k * 4 + c] - Z[c]))); if (a === 255) { deck++; if (d > 1) aus++; } else if (a > 0) { teil++; if (d > 1) ausTeil++; } else transp++; }
  return { w: info.width, h: info.height, deck, aus, teil, ausTeil, transp }; }

async function main() {
  const dir = path.resolve(process.argv[2] || path.join(__dirname, 'pruefung')); fs.mkdirSync(dir, { recursive: true });
  const img = await L.loadRGB(L.refPath()); if (process.argv[3] === 'zeichen') await zeichenRechnen(img);
  const W = JSON.parse(fs.readFileSync(WERTE, 'utf8')), geo = W['logo-band'], farbe = L.hex(L.C.PAPIER.map((p, c) => p * L.C.VERHAELTNIS.logo[c]));
  const S = LOGO.signalY(img, geo.region).map, SRB = LOGO.signal(img, geo.region).map, D = await LOGO.druckSignal(geo, 0), md = ['# Logo-Messung T-20261021-18 (logo-pruefen.cjs, automatisch erzeugt)', ''];
  // Messgrenze
  md.push('## Messgrenze (umriss zwischen den Referenzmasken bei 40 % und 60 % Schwelle, Signal Luma Y)', '| Zeichen | Massstab | p95 | Max | Mittel |', '|---|---|---|---|---|');
  for (const [n, r, s] of [['logo-band', geo.region, 4], ['logo-band', geo.region, 8], ['zeichen-oben', ZR, 8]]) { const Sm = LOGO.signalY(img, r).map, u = LOGO.umriss(Sm, Sm, 0.4, 0.6, s); md.push(`| ${n} | ${s}x | ${f(u.p95)} px | ${f(u.max)} px | ${f(u.mittel)} px |`); }
  md.push('', 'Toleranz L2: p95 ≤ 0,75 px, Max ≤ 1,5 px. Die Messgrenze liegt darueber (Toleranz nicht gelockert).', '');
  // L2
  const u = LOGO.umriss(S, D, 0.5, 0.5, 4, true), u8 = LOGO.umriss(S, D, 0.5, 0.5, 8), uAlt = W['logo-band'].vorher;
  md.push('## L2 Umriss logo-band (K7-Verfahren: Signal Luma Y in Referenz und Druck, 50 %, 4x bilinear, symmetrisch; gewertet)', '| Stand | p95 | Max | Mittel | n Kantenpunkte |', '|---|---|---|---|---|',
    `| T-20261020-10 (Strich 4,20, runde Enden; damals R-B gemessen) | 1,58 px | 3,09 px | 0,66 px | 8563 |`, `| **neu (gefuellte Linienzeichnung)** | **${f(u.p95)} px** | **${f(u.max)} px** | ${f(u.mittel)} px | ${u.n} |`,
    `| neu, Kontrolle 8x | ${f(u8.p95)} px | ${f(u8.max)} px | ${f(u8.mittel)} px | ${u8.n} |`, '', `L2 erfuellt: p95 ${u.p95 <= 0.75 ? 'ja' : '**nein**'}, Max ${u.max <= 1.5 ? 'ja' : '**nein**'}.`);
  const top = [...u.punkte].sort((a, b) => b[0] - a[0]); const cl = []; for (const p of top) if (!cl.some(q => Math.hypot(q[1] - p[1], q[2] - p[2]) < 4)) cl.push(p);
  md.push('Groesste Abweichungen (Referenzpixel, Orte > p95, je 4 px zusammengefasst): ' + cl.slice(0, 8).map(p => `${f(p[0])} px bei (${f(p[1] + geo.region[0], 1)} / ${f(p[2] + geo.region[1], 1)})`).join('; ') + '.', '');
  // L3
  const ml = SRB, sr = LOGO.strichstaerkeTeile(geo, LOGO.bilAt(S, geo.region)), sd = LOGO.strichstaerkeTeile(geo, LOGO.bilAt(D, geo.region)), sy = LOGO.strichstaerkeTeile(geo, LOGO.bilAt(ml, geo.region));
  md.push('## L3 Strichstaerke je Teil (Querschnittsprofil, 50 % zwischen Grund und Spitze, Median; Signal Luma Y; gewertet)', '| Teil | Referenz Y | Druck | Δ % | ≤ ±10 % | n | Info: Referenz R-B |', '|---|---|---|---|---|---|---|');
  const namen = { 'blatt-mitte': 'Umriss Mittelblatt', 'blatt-links': 'Umriss Seitenblatt links', 'blatt-rechts': 'Umriss Seitenblatt rechts', 'mittelrippe': 'Mittelrippe', 'seitenrippe-links': 'Seitenrippe links', 'seitenrippe-rechts': 'Seitenrippe rechts', 'stiel': 'Stiel', 'seitenzweig-links': 'Seitenzweig links', 'seitenzweig-rechts': 'Seitenzweig rechts' };
  let l3 = true; for (const [k, n] of Object.entries(namen)) { const d = (sd[k].median - sr[k].median) / sr[k].median * 100; l3 = l3 && Math.abs(d) <= 10; md.push(`| ${n} | ${f(sr[k].median)} px | ${f(sd[k].median)} px | ${f(d, 1)} | ${Math.abs(d) <= 10 ? 'ja' : '**nein**'} | ${sr[k].n} | ${f(sy[k].median)} px |`); }
  md.push('', `L3 erfuellt: ${l3 ? 'ja' : '**nein**'}. R-B-Spalte nur Info: R-B ist Chroma (WebP 4:2:0, halbe Aufloesung) und daher breiter als die Luminanz.`, '');
  // Zusatz (nur Info, Wertung bleibt R-B): Helligkeitssignal Luma Y statt R-B, Referenz und Druck (Druck = Deckung, Gold auf dunklem Band)
  const ymg = LOGO.umriss(ml, ml, 0.4, 0.6, 4), uy = LOGO.umriss(ml, D, 0.5, 0.5, 4), uy8 = LOGO.umriss(ml, D, 0.5, 0.5, 8);
  md.push('## Info (nicht gewertet): L2 und L3 mit R-B (Goldsignal wie K7, normiert 30-%- bis 99,5-%-Wert). Gewertet wird Luma Y = 0,299 R + 0,587 G + 0,114 B', '| Messung | p95 | Max | Mittel |', '|---|---|---|---|',
    `| Messgrenze R-B (Referenz 40 % vs 60 %, 4x) | ${f(ymg.p95)} px | ${f(ymg.max)} px | ${f(ymg.mittel)} px |`, `| L2 R-B: Referenz vs Druck, 50 %, 4x | ${f(uy.p95)} px | ${f(uy.max)} px | ${f(uy.mittel)} px |`,
    `| L2 R-B: Kontrolle 8x | ${f(uy8.p95)} px | ${f(uy8.max)} px | ${f(uy8.mittel)} px |`, '', '| Teil (L3 R-B) | Referenz R-B | Druck | Δ % | ≤ ±10 % |', '|---|---|---|---|---|');
  let l3y = true; for (const [k, n] of Object.entries(namen)) { const d = (sd[k].median - sy[k].median) / sy[k].median * 100; l3y = l3y && Math.abs(d) <= 10; md.push(`| ${n} | ${f(sy[k].median)} px | ${f(sd[k].median)} px | ${f(d, 1)} | ${Math.abs(d) <= 10 ? 'ja' : 'nein'} |`); }
  md.push('', `Mit R-B waeren L2 p95 ${uy.p95 <= 0.75 ? 'ja' : 'nein'}, Max ${uy.max <= 1.5 ? 'ja' : 'nein'}, L3 ${l3y ? 'ja' : 'nein'} (nur Info; der Druck ist auf Y angepasst).`, '');
  // L1
  md.push('## L1 Merkmale (Nachweis logo-details.png)', '| Merkmal | Wert |', '|---|---|');
  for (const b of ['blatt-mitte', 'blatt-links', 'blatt-rechts']) { const a = geo.teile[b].aussen, i = geo.teile[b].innen; md.push(`| ${namen[b]}: Spitze, Winkel aussen / innen | ${f(winkel(a[2], a[3], a[5], 1), 1)}° / ${f(winkel(i[2], i[3], i[5]), 1)}° (spitze Ecke, Umriss offen: evenodd) |`); }
  const st = geo.teile.stiel; md.push(`| Stielende | ${st.enden[1]} (quer abgeschnitten), Breite ${f(st.w[4])} px |`);
  for (const r of ['mittelrippe', 'seitenrippe-links', 'seitenrippe-rechts']) md.push(`| ${namen[r]}: oberes Ende | ${geo.teile[r].enden[0]}, Auslauf ${f(geo.teile[r].spitze[0])} px |`);
  for (const k of ['knoten-mitte', 'knoten-gabel', 'knoten-links', 'knoten-rechts']) md.push(`| ${k}: Dreieck, sichtbarer Beitrag (Deckung ohne/mit) | ${f(await knotenBeitrag(geo, k))} px² |`);
  md.push('');
  await bildDetails(path.join(dir, 'logo-details.png'), img, geo, farbe, S, D);
  // L4
  const Z = W['zeichen-oben'], pr = Z.pruefung;
  if (pr) { const B = W['logo-band'], [bx0, by0, bx1, by1] = LOGO.grenzen(B), Sz = LOGO.signalY(img, ZR).map, mg = LOGO.umriss(Sz, Sz, 0.4, 0.6, 8), rb = q => q.umriss8RB ? `${f(q.umriss8RB.p95)} / ${f(q.umriss8RB.max)} px` : '–';
    md.push('## L4 Bandzeichen (Signal Luma Y wie L2, R-B nur Info; Ausgleich Blattlogo -> Region x 232-302, y 32-49; umriss 50 %, 8x bilinear; gewertet p95)', '| Variante | p95 | Max | Mittel | Massstab | k (senkrecht) | Drehung | Lage (Mitte) | Info R-B p95 / Max |', '|---|---|---|---|---|---|---|---|---|',
      `| heute (Stand T-20261020-10, Strichform T-20261019-02) = p95_alt | ${f(pr.alt.umriss8.p95)} px | ${f(pr.alt.umriss8.max)} px | ${f(pr.alt.umriss8.mittel)} px | – | – | – | – | ${rb(pr.alt)} |`);
    for (const r of ['stiel-vorn', 'stiel-hinten']) { const q = pr[r]; md.push(`| Blattlogo, ${r} | ${f(q.umriss8.p95)} px | ${f(q.umriss8.max)} px | ${f(q.umriss8.mittel)} px | ${f(q.massstab, 3)} | ${f(q.k, 3)} | ${f(q.drehungGrad, 1)}° | ${f(q.lage[0], 1)} / ${f(q.lage[1], 1)} | ${rb(q)} |`); }
    const bR = pr['stiel-vorn'].umriss8.p95 <= pr['stiel-hinten'].umriss8.p95 ? 'stiel-vorn' : 'stiel-hinten', pa = pr.alt.umriss8.p95, pn = pr[bR].umriss8.p95;
    md.push('', `Messgrenze der Zeichen-Region (Y, Masken 40 % / 60 %, 8x): p95 ${f(mg.p95)} px, Max ${f(mg.max)} px. Bestes p95_neu: ${bR}. p95_alt − p95_neu = ${f(pa)} − ${f(pn)} = ${f(pa - pn)} px = ${f((pa - pn) / mg.p95)} × Messgrenze p95 (${f((pa - pn) / mg.max)} × Max). Hinweis nur fuer die Entscheidung des Nutzers; die Regel bleibt: neu, wenn p95_neu < p95_alt.`, '',
      Z.draufsicht ? `Entscheidung: p95_neu ${f(pn)} px < p95_alt ${f(pa)} px -> zeichen-oben = Blattlogo in Draufsicht (${Z.ausrichtung}; ungestaucht, nicht gedreht). Groesse ${f(bx1 - bx0)} × ${f(by1 - by0)} Referenzpixel des Bandes, auf dem Kork x ${f(pr[Z.ausrichtung].massstab, 3)} = ${f((bx1 - bx0) * pr[Z.ausrichtung].massstab * MM_PRO_PX)} mm breit (B = 52,7 mm ≙ 448,6 px); senkrechte Stauchung k ${f(pr[Z.ausrichtung].k, 3)} nur fuer die Messung.`
      : `Entscheidung: p95_neu ${f(pn)} px ≥ p95_alt ${f(pa)} px -> zeichen-oben bleibt das heutige Zeichen.`, '');
    await bildZeichen(path.join(dir, 'zeichen-oben-fit.png'), img, W, farbe); }
  // L5
  const A = path.resolve(__dirname, '../../../pipeline/blender/label-assets'); md.push('## L5 Farbe und Groesse der PNG', '| Datei | Groesse | deckend (a = 255) | davon ≠ #c19c58 ±1 | Randpixel 0 < a < 255 | davon ≠ ±1 |', '|---|---|---|---|---|---|');
  for (const n of ['logo-band.png', 'zeichen-oben.png']) { const q = await farbePNG(path.join(A, n)); md.push(`| ${n} | ${q.w} × ${q.h} | ${q.deck} | ${q.aus} | ${q.teil} | ${q.ausTeil} |`); }
  fs.writeFileSync(path.join(dir, 'logo-messung.md'), md.join('\n') + '\n'); console.log(md.filter(l => /erfuellt|Entscheidung|^\| (Umriss|Mittel|Seiten|Stiel|Blattlogo|heute|logo|zeichen)/.test(l)).join('\n'));
}
main();
