'use strict';
// Unschaerfe der Referenz schaetzen (einmalig, Ergebnis fest in config.cjs FALTUNG). Nicht Teil des Builds.
// Aufruf: node faltung.cjs <pruefordner>   -> <pruefordner>/faltung.json (Rohwerte); faltung.md wird von Hand daraus geschrieben
//  1 Kantenrampen 10-90 % (sigma = Rampe / 2,563) an Flaggenstreifen (senkrechte Profile, je Kanal),
//    SAFFRON-Staemmen (waagrechte Profile, Tinte 'dunkel') und ROYAL-Staemmen (waagrechte Profile, Tinte 'gold');
//    gleiche Kanten und gleiches Verfahren im ungefalteten Druckbild (librsvg-Kantenglaettung) -> sigma_druck.
//  2 Gegenprobe: sigma_zusatz, bei dem das gefaltete Druckbild in den Fenstern SAFFRON und ROYAL am besten zur Referenz passt
//    (kleinste Quadrate der Tintenkarte, Verstaerkung und Versatz je Fenster frei).
const path = require('path');
const fs = require('fs');
const L = require('./lib.cjs');
const S = require('./satz.cjs');
const M = require('./messen.cjs');
const { referenz } = require('./referenz.cjs');
const LABEL = path.resolve(__dirname, '..');
const K = 2 * 1.2815516; // Rampe 10-90 % einer gaussgefalteten Stufe = 2,563 sigma

// Rampen in einem Profil p: Gradientmaxima, monoton bis zum Plateau, Kontrast >= kmin, hohe Seite >= breit px ueber 50 %
function rampen(p, kmin, breit) {
  const out = [];
  for (let i = 1; i < p.length - 2; i++) {
    const g = p[i + 1] - p[i], sg = Math.sign(g); if (!sg) continue;
    if (Math.abs(g) < Math.abs(p[i] - p[i - 1]) || Math.abs(g) < Math.abs(p[i + 2] - p[i + 1])) continue;
    let a = i; while (a > 0 && (p[a] - p[a - 1]) * sg > 0) a--;
    let b = i + 1; while (b < p.length - 1 && (p[b + 1] - p[b]) * sg > 0) b++;
    const lo = p[a], hi = p[b]; if ((hi - lo) * sg < kmin) continue;
    const lev = f => lo + f * (hi - lo);
    const cross = Lv => { for (let j = a; j < b; j++) if ((p[j] - Lv) * sg <= 0 && (p[j + 1] - Lv) * sg > 0) return j + (Lv - p[j]) / (p[j + 1] - p[j]); return NaN; };
    // Breite der hohen Seite (ueber 50 %) und der niedrigen Seite (unter 50 %)
    const x50 = cross(lev(0.5)); let nh = 0, nl = 0;
    for (let j = Math.ceil(x50); j >= 0 && j < p.length && (sg > 0 ? p[j] >= lev(0.5) : p[j] <= lev(0.5)) && nh < breit; j += sg > 0 ? 1 : -1) nh++;
    for (let j = Math.floor(x50); j >= 0 && j < p.length && (sg > 0 ? p[j] < lev(0.5) : p[j] > lev(0.5)) && nl < 3; j -= sg > 0 ? 1 : -1) nl++;
    if (nh < breit || nl < 3) continue;
    const r = Math.abs(cross(lev(0.9)) - cross(lev(0.1))); if (!isFinite(r)) continue;
    // Erf-Anpassung (kleinste Quadrate, lo/hi linear frei) auf hoechstens 4 px je Seite, nicht ueber die Nachbarkante
    const xs = []; for (let j = Math.round(x50) - Math.min(4, nl + 1); j <= Math.round(x50) + Math.min(4, nh - 1); j++) if (j >= 0 && j < p.length) xs.push(j);
    let best = [Infinity, NaN];
    for (let s = 0.2; s <= 3.0001; s += 0.02) for (let x0 = x50 - 1; x0 <= x50 + 1.0001; x0 += 0.05) { let n = 0, a = 0, aa = 0, y = 0, ay = 0, yy = 0;
      for (const j of xs) { const e = 0.5 * (1 + erf(sg * (j - x0) / (s * Math.SQRT2))); n++; a += e; aa += e * e; y += p[j]; ay += e * p[j]; yy += p[j] * p[j]; }
      const den = n * aa - a * a; if (!den) continue; const k = (n * ay - a * y) / den, c = (y - k * a) / n, sse = yy - 2 * k * ay - 2 * c * y + k * k * aa + 2 * k * c * a + n * c * c; if (sse < best[0]) best = [sse, s]; }
    out.push({ x: x50, r, sFit: best[1] });
  }
  return out;
}
function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
const median = a => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };
const q = (a, f) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };

// Kantenmessung auf einem Verhaeltnisbild; Boxen aus der Referenzmessung (gleiche Kanten fuer Referenz und Druck)
function kanten(img, boxes) {
  const { w, h, d } = img; const ink = { dunkel: L.inkMap(img, 'dunkel'), gold: L.inkMap(img, 'gold') }; const res = {};
  // Flagge: senkrechte Profile in den mittleren 60 % der Breite, je Kanal (1 - Verhaeltnis)
  { const b = boxes.Flagge, i0 = Math.ceil((b.u0 + 0.2 * (b.u1 - b.u0)) * w), i1 = Math.floor((b.u1 - 0.2 * (b.u1 - b.u0)) * w), j0 = Math.floor(b.v0 * h) - 6, j1 = Math.ceil(b.v1 * h) + 6; const r = [];
    for (let i = i0; i <= i1; i++) for (let c = 0; c < 3; c++) { const p = []; for (let j = j0; j <= j1; j++) p.push(1 - d[(j * w + i) * 3 + c]); r.push(...rampen(p, 0.3, 4)); }
    res.Flagge = r; }
  // Buchstaben: waagrechte Profile in den mittleren 40 % der Zeilenhoehe
  for (const [id, mode] of [['SAFFRON', 'dunkel'], ['ROYAL', 'gold'], ['HERAT NEGIN', 'gold']]) { // HERAT NEGIN R - B: Gegenprobe sigmaC (T-20261021-15)
    const b = boxes[id], m = ink[mode].m, hh = b.v1 - b.v0, j0 = Math.ceil((b.v0 + 0.3 * hh) * h), j1 = Math.floor((b.v1 - 0.3 * hh) * h), i0 = Math.floor(b.u0 * w) - 4, i1 = Math.ceil(b.u1 * w) + 4;
    let mx = 0; for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) mx = Math.max(mx, m[j * w + i]); const r = [];
    for (let j = j0; j <= j1; j++) { const p = []; for (let i = i0; i <= i1; i++) p.push(m[j * w + i]); r.push(...rampen(p, 0.5 * mx, 4)); }
    res[id] = r; }
  const o = {}; for (const [k, e] of Object.entries(res)) { const v = e.map(x => x.r), f = e.map(x => x.sFit);
    o[k] = { n: v.length, rampeMedian: +median(v).toFixed(3), p25: +q(v, 0.25).toFixed(3), p75: +q(v, 0.75).toFixed(3), sigmaRampe: +(median(v) / K).toFixed(3), sigma: +median(f).toFixed(3), sigmaP25: +q(f, 0.25).toFixed(3), sigmaP75: +q(f, 0.75).toFixed(3) }; }
  o.sigmaMittelArten = +(['Flagge', 'SAFFRON', 'ROYAL'].reduce((s, k) => s + o[k].sigma, 0) / 3).toFixed(3);
  o.sigmaRampeMittelArten = +(['Flagge', 'SAFFRON', 'ROYAL'].reduce((s, k) => s + o[k].sigmaRampe, 0) / 3).toFixed(3);
  return o;
}

// Gegenprobe kleinste Quadrate: Referenz-Tinte ~ a * gefaltete Druck-Tinte + b im Fenster
function lsFehler(R, dr, s) {
  const f = M.falte(dr, s); const o = {};
  for (const id of ['SAFFRON', 'ROYAL', 'Flagge']) { const z = S.zeilen.find(x => x.id === id), A = L.inkMap(R, z.mode).m, B = L.inkMap(f, z.mode).m, { w, h } = R;
    let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
    for (let j = Math.floor(z.win[2] * h); j < Math.ceil(z.win[3] * h); j++) for (let i = Math.floor(z.win[0] * w); i < Math.ceil(z.win[1] * w); i++) { const x = B[j * w + i], y = A[j * w + i]; n++; sx += x; sy += y; sxx += x * x; sxy += x * y; syy += y * y; }
    const a = (n * sxy - sx * sy) / (n * sxx - sx * sx), b = (sy - a * sx) / n; o[id] = (syy - 2 * a * sxy - 2 * b * sy + a * a * sxx + 2 * a * b * sx + n * b * b) / n; }
  return o;
}

(async () => {
  const PRUEF = path.resolve(process.argv[2] || '.'); fs.mkdirSync(PRUEF, { recursive: true });
  const R = await referenz(); const { W, H } = R;
  const et = fs.readFileSync(path.join(LABEL, 'etikett.svg'), 'utf8').replace('xlink:href="berge.png"', 'xlink:href="data:image/png;base64,' + fs.readFileSync(path.join(LABEL, 'berge.png')).toString('base64') + '"');
  const dr = await M.druckRatio(et, W, H), boxes = M.messeAlle(R.ratio).boxes;
  const ref = kanten(R.ratio, boxes), druck = kanten(dr, boxes);
  // Selbsttest: Druck mit bekanntem sigma falten, Verfahren muss sqrt(sigma^2 + sigma_druck^2) liefern
  const test = {}; for (const s of [0.8, 1.2]) test[s] = kanten(M.falte(dr, s), boxes);
  const sigRef = ref.sigmaMittelArten, sigDr = druck.sigmaMittelArten, sigZ = Math.sqrt(Math.max(0, sigRef ** 2 - sigDr ** 2));
  // Modell (i) (T-20261020-15): sigmaY nur aus Helligkeitskanten (Flagge je Kanal, SAFFRON), Chroma wie WebP 4:2:0 (messen.falteI).
  // Kontrolle C1: Kantenschaetzung auf dem Druck ungefaltet, mit einem Gauss 0,565 (T-10) und nach Modell (i)
  const FI = L.C.FALTUNG.modellI, sigYRef = (ref.Flagge.sigma + ref.SAFFRON.sigma) / 2, sigYDr = (druck.Flagge.sigma + druck.SAFFRON.sigma) / 2;
  const modellI = { sigmaYRef: +sigYRef.toFixed(3), sigmaYDruck: +sigYDr.toFixed(3), sigmaYBerechnet: +Math.sqrt(Math.max(0, sigYRef ** 2 - sigYDr ** 2)).toFixed(3), sigmaYConfig: FI.sigmaY,
    kontrolle: { ungefaltet: druck, luma0565: kanten(M.falte(dr, L.C.FALTUNG.sigmaZusatz), boxes), modellI: kanten(M.falteI(dr, { q: R.q, papier: R.paperMean }, FI.sigmaY), boxes) } };
  modellI.abwProz = Object.fromEntries(['Flagge', 'SAFFRON', 'ROYAL'].map(k => [k, +(100 * (modellI.kontrolle.modellI[k].sigma / ref[k].sigma - 1)).toFixed(1)]));
  modellI.ok = Object.values(modellI.abwProz).every(v => Math.abs(v) <= 15);
  // D1 (T-20261021-15): Modell (i) + Chroma-Gauss sigmaC auf Cb/Cr vor dem 2 x 2-Mittel. sigmaC aus ROYAL R - B (+-5 %),
  // unabhaengige Gegenprobe HERAT NEGIN R - B, Flagge, SAFFRON (je +-15 %).
  const geoI = { q: R.q, papier: R.paperMean }, AR = ['Flagge', 'SAFFRON', 'ROYAL', 'HERAT NEGIN'], sig = k => Object.fromEntries(AR.map(a => [a, k[a].sigma]));
  const modellIC = { sigmaY: FI.sigmaY, sigmaC: FI.sigmaC, referenz: sig(ref), sigmaC0: sig(modellI.kontrolle.modellI), scan: {} };
  for (const s of [1.0, 1.25, 1.4, 1.5, 1.6, 1.75, 2.0]) modellIC.scan[s] = sig(kanten(M.falteI(dr, geoI, FI.sigmaY, s), boxes));
  modellIC.kontrolle = sig(kanten(M.falteI(dr, geoI, FI.sigmaY, FI.sigmaC), boxes));
  modellIC.abwProz = Object.fromEntries(AR.map(a => [a, +(100 * (modellIC.kontrolle[a] / ref[a].sigma - 1)).toFixed(1)]));
  modellIC.ok = Math.abs(modellIC.abwProz.ROYAL) <= 5 && ['Flagge', 'SAFFRON', 'HERAT NEGIN'].every(a => Math.abs(modellIC.abwProz[a]) <= 15);
  const ls = []; for (let s = 0; s <= 2.5001; s += 0.05) { const e = lsFehler(R.ratio, dr, s); ls.push({ s: +s.toFixed(2), ...e, summe: e.SAFFRON + e.ROYAL }); }
  const best = k => ls.reduce((m, x) => x[k] < m[k] ? x : m).s;
  const gegen = { SAFFRON: best('SAFFRON'), ROYAL: best('ROYAL'), summe: best('summe'), FlaggeInfo: best('Flagge') };
  const out = { referenzmassstab: [W, H], faktorRampeSigma: +K.toFixed(4), referenz: ref, druck, selbsttest: test,
    sigmaRef: sigRef, sigmaDruck: sigDr, modellI, modellIC, sigmaZusatz: +sigZ.toFixed(3), gegenprobeSigmaZusatz: gegen,
    gegenprobeSigmaRef: Object.fromEntries(Object.entries(gegen).map(([k, v]) => [k, +Math.sqrt(v * v + sigDr * sigDr).toFixed(3)])),
    lsKurve: ls.filter((x, i) => i % 2 === 0).map(x => ({ s: x.s, SAFFRON: +x.SAFFRON.toExponential(4), ROYAL: +x.ROYAL.toExponential(4), Flagge: +x.Flagge.toExponential(4) })) };
  console.log('IC', JSON.stringify(modellIC)); fs.writeFileSync(path.join(PRUEF, 'faltung.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ modellI: { ...modellI, kontrolle: Object.fromEntries(Object.entries(modellI.kontrolle).map(([k, v]) => [k, [v.Flagge.sigma, v.SAFFRON.sigma, v.ROYAL.sigma]])) } })); console.log(JSON.stringify({ ref, druck, sigRef, sigDr, sigZ: out.sigmaZusatz, gegen, gegenRef: out.gegenprobeSigmaRef, test: Object.fromEntries(Object.entries(test).map(([k, v]) => [k, v.sigmaMittelArten])) }));
})().catch(e => { console.error(e); process.exit(1); });
