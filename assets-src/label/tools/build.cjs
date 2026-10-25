'use strict';
// Ein Einstieg fuer alle Ausgaben des Etiketts.
// Aufruf: node build.cjs [<pruefordner>]
//   immer:        assets-src/label/{logo-band.svg, zeichen-oben.svg, berge.png, druck.svg, etikett.svg}
//                 pipeline/blender/label-assets/{logo-band.png, zeichen-oben.png, etikett.png, etikett-gold.png}
//   pruefordner:  zusaetzlich berge-vergleich.png, berge-entfernt.png, berge-messung.json (berge.cjs),
//                 ueberlagerung-etikett.png, ueberlagerung-logo.png, endmessung.json, Abschnitt "Endmessung" in messung.md,
//                 build-hashes.txt (SHA-256 aller Ausgaben)
// Nicht Teil des Builds (einmalige Anpassung, Ergebnis fest in satz-werte.json bzw. logo-werte.json):
//   node anpassen.cjs <pruefordner> <kandidaten-schriftordner>,  node logo.cjs anpassen
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const L = require('./lib.cjs');
const S = require('./satz.cjs');
const D = require('./druck.cjs');
const M = require('./messen.cjs');
const LOGO = require('./logo.cjs');
const B = require('./berge.cjs');
const { referenz } = require('./referenz.cjs');
const C = L.C;

const LABEL = path.resolve(__dirname, '..');                        // assets-src/label
const ROOT = path.resolve(__dirname, '../../..');                    // Projektwurzel (royal-spices-v1 bzw. out/)
const ASSETS = path.join(ROOT, 'pipeline', 'blender', 'label-assets');
const PRUEF = process.argv[2] ? path.resolve(process.argv[2]) : null;
const PH = C.FORMAT.pngHoehe, PW = Math.round(PH * C.FORMAT.breiteZuHoehe); // 3225 x 4096
const GOLD = ['gold', 'goldKlein', 'herat'];                         // Farbgruppen der Goldmaske (Flagge nicht)
const BAND = [0x24, 0x27, 0x13];                                     // Bandfarbe der Referenz (nur Pruefbild Logo)
const ORN = ['EST-Strich links', 'EST-Raute', 'EST-Strich rechts', 'Linie links', 'Raute', 'Linie rechts', 'Strich links', 'Strich rechts', 'Flagge'];

const png = (buf, w, h, ch) => { const p = L.sharp(Buffer.from(buf.buffer || buf, buf.byteOffset || 0, buf.length), { raw: { width: w, height: h, channels: ch } });
  return (ch === 1 ? p.toColourspace('b-w') : p).png({ compressionLevel: 9 }); }; // 1 Kanal -> echte Graustufen-PNG
const u8 = f => L.toU8 ? L.toU8(f) : Uint8Array.from(f, v => Math.max(0, Math.min(255, Math.round(v))));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const pr = v => +(v * 100).toFixed(3);

// etikett.svg: Papier (Rechteck mit Eckradius) + Berge als Bildebene (auf die Etikettform beschnitten) + Vektordruck
function etikettSVG(werte, href) {
  const r = D.f3(D.eckR());
  return D.kopf() + `<defs><clipPath id="etikett-form"><rect x="0" y="0" width="${D.VW}" height="${D.VH}" rx="${r}" ry="${r}"/></clipPath></defs>`
    + D.papierRect()
    + `<image id="berge" x="0" y="0" width="${D.VW}" height="${D.VH}" preserveAspectRatio="none" clip-path="url(#etikett-form)" xlink:href="${href}"/>`
    + `<g id="druck">${D.druckGruppe(werte)}</g></svg>`;
}

function stat(get, n) { // get(i) -> [r,g,b] oder null; Mittel und Standardabweichung je Kanal
  const s = [0, 0, 0], q = [0, 0, 0]; let c = 0;
  for (let i = 0; i < n; i++) { const p = get(i); if (!p) continue; c++; for (let k = 0; k < 3; k++) { s[k] += p[k]; q[k] += p[k] * p[k]; } }
  const m = s.map(v => v / c); return { n: c, mittel: m.map(v => +v.toFixed(3)), sd: q.map((v, k) => +Math.sqrt(Math.max(0, v / c - m[k] * m[k])).toFixed(4)) };
}

// Breite der EST-Raute ohne die anstossenden Striche. Fenster EST-Raute um 0,03 Lw je Seite erweitert, Zeilen des Strichbands
// (Referenzrahmen der EST-Striche +-1,5 px) ausgelassen; je Zeile Lauf ueber der Schwelle (0,5 x 99,5-%-Wert der Raute-Tinte) um die
// Rautenmitte, Kanten interpoliert; Breite(|v - vMitte|) linear angepasst, Achsenabschnitt = Breite in der Mittelzeile.
// Rahmen (Mitte, Hoehe, Strichband) aus der Referenzmessung, damit Referenz und Druck dieselben Zeilen nutzen.
function rauteBreite(ink, rb) {
  const { w, h, m } = ink, z = S.zeilen.find(q => q.id === 'EST-Raute'), b = rb['EST-Raute'], sl = rb['EST-Strich links'], sr = rb['EST-Strich rechts'];
  const i0 = Math.floor((z.win[0] - 0.03) * w), i1 = Math.ceil((z.win[1] + 0.03) * w), uc = (b.u0 + b.u1) / 2 * w - 0.5, vc = (b.v0 + b.v1) / 2 * h - 0.5, hh = (b.v1 - b.v0) / 2 * h;
  const s0 = Math.min(sl.v0, sr.v0) * h - 0.5 - 1.5, s1 = Math.max(sl.v1, sr.v1) * h - 0.5 + 1.5;
  const vals = []; for (let j = Math.floor(b.v0 * h); j < Math.ceil(b.v1 * h); j++) for (let i = Math.round(uc) - 3; i <= Math.round(uc) + 3; i++) vals.push(m[j * w + i]);
  vals.sort((p, q) => p - q); const T = 0.5 * vals[Math.floor(vals.length * 0.995)]; const pts = [];
  for (let j = Math.floor(b.v0 * h); j < Math.ceil(b.v1 * h); j++) { const dy = Math.abs(j - vc); if ((j >= s0 && j <= s1) || dy > 0.8 * hh) continue;
    const r = k => m[j * w + k]; let c = Math.round(uc); if (r(c) < T) continue; let a = c, e = c; while (a > i0 && r(a - 1) >= T) a--; while (e < i1 && r(e + 1) >= T) e++;
    const lo = a - (r(a) - T) / (r(a) - r(a - 1)), hi = e + (r(e) - T) / (r(e) - r(e + 1)); pts.push([dy, hi - lo]); }
  const n = pts.length, sx = pts.reduce((s, p) => s + p[0], 0), sy = pts.reduce((s, p) => s + p[1], 0), sxx = pts.reduce((s, p) => s + p[0] * p[0], 0), sxy = pts.reduce((s, p) => s + p[0] * p[1], 0);
  const k = (n * sxy - sx * sy) / (n * sxx - sx * sx), c0 = (sy - k * sx) / n;
  return { zeilen: n, breitePx: +c0.toFixed(2), breiteLw: +(c0 / w).toFixed(4), steigung: +k.toFixed(3) };
}

async function endmessung(werte, etRender, druckSvg, et, bergeA) {
  const R = await referenz(); const { W, H } = R;
  const ref = M.messeAlle(R.ratio), RG = M.gruppen(ref.boxes);
  const drR = await M.druckRatio(etRender, W, H), dr = M.messeAlle(drR), DG = M.gruppen(dr.boxes); // Druckbild im Referenzmassstab
  const vergl = (a, b) => { const d = { oben: pr(b.v0 - a.v0), unten: pr(b.v1 - a.v1), breite: pr((b.u1 - b.u0) - (a.u1 - a.u0)), mitte: pr((b.u0 + b.u1 - a.u0 - a.u1) / 2) };
    return { ref: [a.u0, a.u1, a.v0, a.v1].map(v => +v.toFixed(4)), druck: [b.u0, b.u1, b.v0, b.v1].map(v => +v.toFixed(4)), d, ok: Math.abs(d.oben) <= 1 && Math.abs(d.unten) <= 1 && Math.abs(d.breite) <= 2 }; };
  const E = { referenzmassstab: [W, H], Lw: +R.Lw.toFixed(2), Lh: +R.Lh.toFixed(2) };
  // K1 Format
  const ecke = (sx, sy) => { let prev = 0; for (let i = 0; i < 600; i++) { const x = sx > 0 ? i : PW - 1 - i, y = sy > 0 ? i : PH - 1 - i, a = et.d[(y * PW + x) * 4 + 3];
    if (a >= 127.5) { const t = i === 0 ? 0 : i - 1 + (127.5 - prev) / (a - prev); return (t + 0.5) / (1 - Math.SQRT1_2); } prev = a; } return NaN; };
  const radien = [ecke(1, 1), ecke(-1, 1), ecke(-1, -1), ecke(1, -1)], rM = radien.reduce((s, v) => s + v, 0) / 4, rSoll = C.FORMAT.eckradiusLw * PW;
  E.K1 = { w: PW, h: PH, wh: +(PW / PH).toFixed(5), whAbwProz: +((PW / PH / C.FORMAT.breiteZuHoehe - 1) * 100).toFixed(3), radienPx: radien.map(v => +v.toFixed(2)),
    radiusLw: +(rM / PW).toFixed(5), radiusAbwProz: +((rM / rSoll - 1) * 100).toFixed(2), svgViewBox: [D.VW, D.VH] };
  E.K1.ok = PH >= 4096 && Math.abs(E.K1.whAbwProz) <= 0.2 && Math.abs(E.K1.radiusAbwProz) <= 10;
  // K2 Zeilen, K5 Ornamente und Flagge
  E.K2 = Object.keys(S.gruppen).map(name => ({ name, ...vergl(RG[name], DG[name]) }));
  E.K5 = ORN.map(id => ({ name: id, ...vergl(ref.boxes[id], dr.boxes[id]) }));
  const fb = werte.elemente.Flagge.box, xm = Math.round((fb[0] + fb[1]) / 2 * PW), KL = { schwarz: C.FLAGGE.schwarz, rot: C.FLAGGE.rot, gold: C.FLAGGE.gold, papier: C.PAPIER };
  const runs = []; let cur = null;
  for (let y = Math.floor(fb[2] * PH) - 8; y <= Math.ceil(fb[3] * PH) + 8; y++) { const k = (y * PW + xm) * 4; let best = null, bd = Infinity;
    for (const [n, c] of Object.entries(KL)) { const dd = (et.d[k] - c[0]) ** 2 + (et.d[k + 1] - c[1]) ** 2 + (et.d[k + 2] - c[2]) ** 2; if (dd < bd) { bd = dd; best = n; } }
    if (!cur || cur.farbe !== best) { cur = { farbe: best, n: 0 }; runs.push(cur); } cur.n++; }
  E.K5flagge = runs.filter(r => r.farbe !== 'papier' && r.n >= 3).map(r => ({ farbe: r.farbe, hoeheLhProz: pr(r.n / PH) }));
  E.K5flaggeOk = E.K5flagge.map(r => r.farbe).join(',') === 'schwarz,rot,gold';
  // K3 Farben: dunkelste 12 % je Farbgruppe, Referenz und Druckbild mit demselben Verfahren im Referenzmassstab
  const GF = {}; for (const z of S.zeilen) if (z.farbe) (GF[z.farbe] = GF[z.farbe] || []).push(z.id);
  E.K3 = Object.entries(GF).map(([g, ids]) => {
    const t = M.dunkel12(R.ratio, ref.I, ref.boxes, ids), c = M.dunkel12(drR, dr.I, dr.boxes, ids), hx = D.farbe(g);
    const direkt = [1, 3, 5].map((i, k) => parseInt(hx.substr(i, 2), 16) / C.PAPIER[k]);
    const abw = c.map((v, k) => pr(v / t[k] - 1)), abwD = direkt.map((v, k) => pr(v / t[k] - 1));
    return { gruppe: g, elemente: ids, farbe: hx, ref: t.map(v => +v.toFixed(4)), druck: c.map(v => +v.toFixed(4)), abwProz: abw, absAbw: c.map((v, k) => +(v - t[k]).toFixed(4)),
      direkt: direkt.map(v => +v.toFixed(4)), abwDirektProz: abwD, ok: abw.every(v => Math.abs(v) <= 15) };
  });
  E.K3el = S.zeilen.filter(z => z.farbe).map(z => { const t = M.dunkel12(R.ratio, ref.I, ref.boxes, [z.id]), c = M.dunkel12(drR, dr.I, dr.boxes, [z.id]), abw = c.map((v, k) => pr(v / t[k] - 1));
    return { name: z.id, gruppe: z.farbe, ref: t.map(v => +v.toFixed(4)), druck: c.map(v => +v.toFixed(4)), abwProz: abw, absAbw: c.map((v, k) => +(v - t[k]).toFixed(4)), ok: abw.every(v => Math.abs(v) <= 15) }; });
  // K3 (T-20261021-15): Druckbild im Referenzmassstab nach Modell (i) + sigmaC falten (messen.falteI, config FALTUNG.modellI, faltung.md),
  // dann dasselbe Verfahren (messeAlle auf dem gefalteten Bild, dunkel12). Wertung: Helligkeit Y je Element +-15 % ohne Ausnahme;
  // Farbe je Farbgruppe je Kanal +-15 % (SAFFRON Blau ausgenommen, |Referenz| < 0,01 nur absolut |Delta| <= 0,01); Farbe je Element nur Info.
  const FIc = C.FALTUNG.modellI, drF = M.falteI(drR, { q: R.q, papier: R.paperMean }, FIc.sigmaY, FIc.sigmaC), df = M.messeAlle(drF);
  const wert = (name, t, c) => { const abw = c.map((v, k) => pr(v / t[k] - 1)), abs = c.map((v, k) => +(v - t[k]).toFixed(4));
    const regel = t.map((v, k) => name === 'SAFFRON' && k === 2 ? 'ausgenommen' : Math.abs(v) < 0.01 ? 'absolut' : 'relativ');
    const okK = regel.map((r, k) => r === 'ausgenommen' || (r === 'absolut' ? Math.abs(abs[k]) <= 0.01 : Math.abs(abw[k]) <= 15));
    return { ref: t.map(v => +v.toFixed(4)), druck: c.map(v => +v.toFixed(4)), abwProz: abw, absAbw: abs, regel, ok: okK.every(Boolean) }; };
  const Yw = v => 0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2];
  const hell = (t, c) => { const yt = Yw(t), yc = Yw(c), a = pr(yc / yt - 1); return { ref: +yt.toFixed(4), druck: +yc.toFixed(4), abwProz: a, absAbw: +(yc - yt).toFixed(4), ok: Math.abs(a) <= 15 }; };
  const elF = S.zeilen.filter(z => z.farbe).map(z => ({ name: z.id, gruppe: z.farbe, t: M.dunkel12(R.ratio, ref.I, ref.boxes, [z.id]), c: M.dunkel12(drF, df.I, df.boxes, [z.id]) }));
  E.K3f = { modell: 'falteI', sigmaY: FIc.sigmaY, sigmaC: FIc.sigmaC,
    hell: elF.map(e => ({ name: e.name, gruppe: e.gruppe, ...hell(e.t, e.c) })),
    gruppen: Object.entries(GF).map(([g, ids]) => ({ gruppe: g, elemente: ids, ...wert(ids.join(', '), M.dunkel12(R.ratio, ref.I, ref.boxes, ids), M.dunkel12(drF, df.I, df.boxes, ids)) })),
    elemente: elF.map(e => ({ name: e.name, gruppe: e.gruppe, ...wert(e.name, e.t, e.c) })) };
  E.K3f.okHell = E.K3f.hell.every(r => r.ok); E.K3f.okGruppen = E.K3f.gruppen.every(r => r.ok); E.K3f.ok = E.K3f.okHell && E.K3f.okGruppen;
  // K5 EST-Raute getrennt von den Strichen: Zeilenbreiten ausserhalb des Strichbands, linear auf die Mittelzeile hochgerechnet
  E.K5raute = { ref: rauteBreite(ref.I.gold, ref.boxes), druck: rauteBreite(dr.I.gold, ref.boxes), druckGefaltetInfo: rauteBreite(df.I.gold, ref.boxes) };
  E.K5raute.dLwProz = pr(E.K5raute.druck.breiteLw - E.K5raute.ref.breiteLw); E.K5raute.ok = Math.abs(E.K5raute.dLwProz) <= 2;
  // K8 flach: Papier ausserhalb von Druck und Bergen, Druckfarbe je Element
  const dA = (await L.renderSVG(druckSvg, PW, PH)).d; const N = PW * PH;
  const P = stat(k => (et.d[k * 4 + 3] === 255 && dA[k * 4 + 3] === 0 && bergeA[k] === 0) ? [et.d[k * 4], et.d[k * 4 + 1], et.d[k * 4 + 2]] : null, N);
  E.K8 = { papier: { ...P, soll: C.PAPIER, sdProz255: P.sd.map(v => +(v / 2.55).toFixed(4)), anteilFlaeche: +(P.n / N).toFixed(4) }, elemente: [] };
  const boxStat = (name, x0, x1, y0, y1, soll) => { const w = x1 - x0, n = w * (y1 - y0);
    const s = stat(i => { const x = x0 + i % w, y = y0 + Math.floor(i / w), k = y * PW + x; return dA[k * 4 + 3] === 255 ? [et.d[k * 4], et.d[k * 4 + 1], et.d[k * 4 + 2]] : null; }, n);
    E.K8.elemente.push({ name, soll, ...s, maxSd: Math.max(...s.sd) }); };
  for (const z of S.zeilen) { const b = werte.elemente[z.id].box;
    if (z.art !== 'flagge') { boxStat(z.id, Math.floor(b[0] * PW) - 2, Math.ceil(b[1] * PW) + 2, Math.floor(b[2] * PH) - 2, Math.ceil(b[3] * PH) + 2, D.farbe(z.farbe)); continue; }
    const h = (b[3] - b[2]) / 3; ['schwarz', 'rot', 'gold'].forEach((k, i) => boxStat('Flagge ' + k, Math.ceil(b[0] * PW) + 2, Math.floor(b[1] * PW) - 2, Math.ceil((b[2] + i * h) * PH) + 2, Math.floor((b[2] + (i + 1) * h) * PH) - 2, L.hex(C.FLAGGE[k]))); }
  E.K8.ok = P.sd.every(v => v / 2.55 <= 1) && E.K8.elemente.every(e => e.maxSd / 2.55 <= 1);
  return { E, R, drR, RG, DG };
}

// Pruefbild Etikett: Referenzausschnitt | Druckbild im Referenzmassstab | Ueberlagerung, Zeilenlagen markiert (2x)
async function bildEtikett(file, R, drR, RG, DG) {
  const { W, H } = R, s = 2, pw = W * s, ph = H * s, gap = 12, top = 40, TW = 3 * pw + 2 * gap, TH = top + ph + 30;
  const p1 = u8(R.rect.d), p2 = u8(drR.d.map((v, k) => v * C.PAPIER[k % 3])), p3 = new Uint8Array(W * H * 3);
  for (let k = 0; k < W * H; k++) { const lr = Math.min(1, (R.ratio.d[k * 3] * 0.299 + R.ratio.d[k * 3 + 1] * 0.587 + R.ratio.d[k * 3 + 2] * 0.114)), ld = Math.min(1, drR.d[k * 3] * 0.299 + drR.d[k * 3 + 1] * 0.587 + drR.d[k * 3 + 2] * 0.114);
    p3[k * 3] = Math.round(255 * ld); p3[k * 3 + 1] = Math.round(255 * Math.min(lr, ld)); p3[k * 3 + 2] = Math.round(255 * lr); }
  const gross = async a => png(a, W, H, 3).resize(pw, ph, { kernel: 'nearest' }).toBuffer();
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}" font-family="Arial" font-size="17">`;
  ['Referenz (entzerrt, Lichtverlauf belassen), Zeilen rot', 'Druckbild etikett.svg im Referenzmassstab, Zeilen blau', 'Ueberlagerung: rot = nur Referenz, blau = nur Druck, schwarz = beide']
    .forEach((t, i) => { svg += `<text x="${i * (pw + gap) + 4}" y="26">${t}</text>`; });
  const linien = (G, col, panel) => { for (const b of Object.values(G)) for (const v of [b.v0, b.v1]) { const x = panel * (pw + gap); svg += `<line x1="${x + b.u0 * pw}" x2="${x + b.u1 * pw}" y1="${top + v * ph}" y2="${top + v * ph}" stroke="${col}" stroke-width="1" stroke-opacity="0.8"/>`; } };
  linien(RG, '#e01010', 0); linien(DG, '#1040e0', 1); linien(RG, '#e01010', 2); linien(DG, '#1040e0', 2);
  svg += `<text x="4" y="${TH - 8}">Referenzmassstab ${W} x ${H} px, hier 2x (nearest). Linien: Oberkante und Unterkante jeder Zeile (messen.cjs, gleiche Fenster und Schwellen).</text></svg>`;
  await L.sharp({ create: { width: TW, height: TH, channels: 3, background: '#ffffff' } })
    .composite([{ input: await gross(p1), left: 0, top }, { input: await gross(p2), left: pw + gap, top }, { input: await gross(p3), left: 2 * (pw + gap), top }, { input: Buffer.from(svg), left: 0, top: 0 }])
    .png({ compressionLevel: 9 }).toFile(file);
}

// Pruefbild Logo und Bandzeichen: Referenz | Druck | Ueberlagerung der 50-%-Masken
async function bildLogo(file, img) {
  const werte = JSON.parse(fs.readFileSync(path.join(__dirname, 'logo-werte.json'), 'utf8')); const farbe = L.hex(C.PAPIER.map((p, c) => p * C.VERHAELTNIS.logo[c]));
  const gap = 12, kopf = 30; const zeilen = [], info = {};
  for (const [name, s] of [['logo-band', 4], ['zeichen-oben', 8]]) {
    const geo = werte[name], [x0, y0, w, h] = geo.region, pw = w * s, ph = h * s;
    const crop = new Uint8Array(w * h * 3); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) for (let c = 0; c < 3; c++) crop[(j * w + i) * 3 + c] = img.d[((y0 + j) * img.w + x0 + i) * 3 + c];
    const r = await L.renderSVG(LOGO.svgRegion(geo, geo.strich, geo.region, farbe), pw, ph); const dp = new Uint8Array(pw * ph * 3);
    for (let k = 0; k < pw * ph; k++) { const a = r.d[k * 4 + 3] / 255; for (let c = 0; c < 3; c++) dp[k * 3 + c] = Math.round(a * r.d[k * 4 + c] + (1 - a) * BAND[c]); }
    const Sg = LOGO.signal(img, geo.region).map, Dm = await LOGO.druckSignal(geo, geo.strich), A = M.upWin(Sg, [0, 1, 0, 1], s), Bm = M.upWin(Dm, [0, 1, 0, 1], s);
    const ov = new Uint8Array(pw * ph * 3); for (let k = 0; k < pw * ph; k++) { const a = A.o[k] >= A.T, b = Bm.o[k] >= Bm.T; ov.set(a && b ? [30, 30, 30] : a ? [225, 60, 50] : b ? [50, 110, 230] : [255, 255, 255], k * 3); }
    const u = LOGO.umriss(Sg, Dm); info[name] = { max: +u.max.toFixed(2), p95: +u.p95.toFixed(2), mittel: +u.mittel.toFixed(2), strich: geo.strich };
    zeilen.push({ titel: `${name}: Referenz x ${x0}-${x0 + w}, y ${y0}-${y0 + h} | Druck (${farbe} auf Bandfarbe) | Masken 50 %  (Umriss p95 ${u.p95.toFixed(2)} px, Max ${u.max.toFixed(2)} px, ${s}x)`,
      teile: [await png(crop, w, h, 3).resize(pw, ph, { kernel: 'nearest' }).toBuffer(), await png(dp, pw, ph, 3).toBuffer(), await png(ov, pw, ph, 3).toBuffer()], pw, ph });
  }
  const TW = Math.max(...zeilen.map(z => 3 * z.pw + 2 * gap)); let y = 0; const comp = [];
  const txt = t => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${kopf}"><text x="4" y="21" font-family="Arial" font-size="17">${t}</text></svg>`);
  for (const z of zeilen) { comp.push({ input: txt(z.titel), left: 0, top: y }); y += kopf; z.teile.forEach((t, i) => comp.push({ input: t, left: i * (z.pw + gap), top: y })); y += z.ph + gap; }
  comp.push({ input: txt('Ueberlagerung: rot = nur Referenz, blau = nur Druck, schwarz = beide (Referenzmassstab, bilinear hochgerechnet, Schwelle 50 %)'), left: 0, top: y }); y += kopf;
  await L.sharp({ create: { width: TW, height: y, channels: 3, background: '#ffffff' } }).composite(comp).png({ compressionLevel: 9 }).toFile(file);
  return info;
}

function mdAbschnitt(E, logoInfo) {
  const f = (v, n = 2) => (typeof v === 'number' ? v.toFixed(n) : String(v)).replace(/\./g, ',');
  const j = b => b ? 'ja' : '**nein**';
  const box = b => `${f(b[2], 4)}–${f(b[3], 4)} / ${f(b[1] - b[0], 4)}`;
  const tab = rows => rows.map(r => `| ${r.name} | ${box(r.ref)} | ${box(r.druck)} | ${f(r.d.oben)} | ${f(r.d.unten)} | ${f(r.d.breite)} | ${f(r.d.mitte)} | ${j(r.ok)} |`).join('\n');
  const kopfZ = '| Element | Referenz oben–unten (Lh) / Breite (Lw) | Druckbild oben–unten / Breite | Δ oben % Lh | Δ unten % Lh | Δ Breite % Lw | Δ Mitte % Lw (Info) | ok |\n|---|---|---|---|---|---|---|---|';
  const K1 = E.K1, P = E.K8.papier;
  return [
    '## Endmessung Teil D (build.cjs, automatisch erzeugt)',
    `Druckbild = etikett.svg (Papier + berge.png + Druck) im Referenzmaßstab ${E.referenzmassstab.join(' × ')} px gerendert, auf PAPIER bezogen; Referenz = entzerrtes Verhältnisbild (Lichtverlauf per Papierpolynom herausgerechnet). Beide mit messen.cjs (gleiche Fenster, Tintenmaße, Schwellen). Lw = ${f(E.Lw)} px, Lh = ${f(E.Lh)} px.`,
    '', '### K1 Format',
    `etikett.png ${K1.w} × ${K1.h} px, W/H = ${f(K1.wh, 5)} (Soll 0,7874, Abw. ${f(K1.whAbwProz, 3)} %). etikett.svg viewBox ${f(K1.svgViewBox[0], 1)} × ${f(K1.svgViewBox[1], 0)} (W/H exakt 0,7874).`,
    `Eckradius aus dem Alphakanal (Diagonale, 50-%-Übergang, 4 Ecken): ${K1.radienPx.map(v => f(v)).join(' / ')} px = ${f(K1.radiusLw, 4)} Lw (Soll 0,0406, Abw. ${f(K1.radiusAbwProz)} %). etikett.png ist etikett.svg gerendert (berge.png als data-URI eingebettet, sonst identisch). K1: ${j(K1.ok)}.`,
    '', '### K2 Zeilenlage (Toleranz oben/unten ≤ 1 % Lh, Breite ≤ 2 % Lw)', kopfZ, tab(E.K2), `K2: ${j(E.K2.every(r => r.ok))}.`,
    '', '### K3 Farben (Verhältnis Farbe/Papier je Kanal R G B; dunkelste 12 % je Farbgruppe; Toleranz ± 15 %)',
    '| Farbgruppe | Druckfarbe | Referenz | Druckbild im Referenzmaßstab | Abw. % | Abw. absolut | Druckfarbe/PAPIER direkt (Info) | Abw. direkt % (Info) | ok |\n|---|---|---|---|---|---|---|---|---|',
    E.K3.map(r => `| ${r.gruppe} (${r.elemente.join(', ')}) | ${r.farbe} | ${r.ref.map(v => f(v, 4)).join(' ')} | ${r.druck.map(v => f(v, 4)).join(' ')} | ${r.abwProz.map(v => f(v, 1)).join(' / ')} | ${r.absAbw.map(v => f(v, 4)).join(' ')} | ${r.direkt.map(v => f(v, 4)).join(' ')} | ${r.abwDirektProz.map(v => f(v, 1)).join(' / ')} | ${j(r.ok)} |`).join('\n'),
    'Je Element (dunkelste 12 % des einzelnen Elements, gleiches Verfahren):',
    '| Element | Gruppe | Referenz | Druckbild im Referenzmaßstab | Abw. % | Abw. absolut | ok |\n|---|---|---|---|---|---|---|',
    E.K3el.map(r => `| ${r.name} | ${r.gruppe} | ${r.ref.map(v => f(v, 4)).join(' ')} | ${r.druck.map(v => f(v, 4)).join(' ')} | ${r.abwProz.map(v => f(v, 1)).join(' / ')} | ${r.absAbw.map(v => f(v, 4)).join(' ')} | ${j(r.ok)} |`).join('\n'),
    `Papier: Verhältnis 1 je Kanal (Bezug). PAPIER ${L.hex(C.PAPIER)} = Referenzpapiermittel × 1,043 (Vorgabe). K3 (Gruppen): ${j(E.K3.every(r => r.ok))}, K3 (Elemente): ${j(E.K3el.every(r => r.ok))}.`,
    '', `### K3 (Wertung, T-20261021-15): Druckbild im Referenzmaßstab gefaltet nach Modell (i) + σ_C (σ_Y = ${f(E.K3f.sigmaY, 3)} px; Chroma-Gauß σ_C = ${f(E.K3f.sigmaC, 2)} px auf Cb/Cr vor dem 2 × 2-Mittel; faltung.md), dann dasselbe Verfahren (messeAlle, dunkel12). Die Tabellen oben (ungefaltet) sind Info.`,
    'Helligkeit je Element (Wertung): Y = 0,299 R + 0,587 G + 0,114 B der Verhältniswerte, ± 15 %, ohne Ausnahme.',
    '| Element | Gruppe | Y Referenz | Y Druck gefaltet | Abw. % | ok |\n|---|---|---|---|---|---|',
    E.K3f.hell.map(r => `| ${r.name} | ${r.gruppe} | ${f(r.ref, 4)} | ${f(r.druck, 4)} | ${f(r.abwProz, 1)} | ${j(r.ok)} |`).join('\n'),
    `Helligkeit je Element: ${j(E.K3f.okHell)}.`,
    '', 'Farbe je Farbgruppe (Wertung): je Kanal ± 15 %; SAFFRON Blau ausgenommen (8-bit-Grenze); Kanäle mit |Referenz| < 0,01 nur absolut (|Δ| ≤ 0,01), Abweichung in Klammern.',
    '| Farbgruppe | Referenz | Druck gefaltet | Abw. % | Abw. absolut | Regel R/G/B | ok |\n|---|---|---|---|---|---|---|',
    E.K3f.gruppen.map(r => `| ${r.gruppe} (${r.elemente.join(', ')}) | ${r.ref.map(v => f(v, 4)).join(' ')} | ${r.druck.map(v => f(v, 4)).join(' ')} | ${r.abwProz.map((v, k) => r.regel[k] === 'relativ' ? f(v, 1) : '(' + f(v, 1) + ')').join(' / ')} | ${r.absAbw.map(v => f(v, 4)).join(' ')} | ${r.regel.join(' / ')} | ${j(r.ok)} |`).join('\n'),
    `Farbe je Farbgruppe: ${j(E.K3f.okGruppen)}. K3 gesamt (Helligkeit je Element und Farbe je Gruppe): ${j(E.K3f.ok)}.`,
    '', 'Farbe je Element (nur Info, Regeln wie oben):', '| Element | Gruppe | Referenz | Druck gefaltet | Abw. % | Regeln erfüllt (Info) |\n|---|---|---|---|---|---|',
    E.K3f.elemente.map(r => `| ${r.name} | ${r.gruppe} | ${r.ref.map(v => f(v, 4)).join(' ')} | ${r.druck.map(v => f(v, 4)).join(' ')} | ${r.abwProz.map((v, k) => r.regel[k] === 'relativ' ? f(v, 1) : '(' + f(v, 1) + ')').join(' / ')} | ${j(r.ok)} |`).join('\n'),
    '', '### K5 Ornamente und Flagge (einzeln; Toleranz wie K2)', kopfZ, tab(E.K5),
    `EST-Raute getrennt von den Strichen (Zeilenbreiten außerhalb des Strichbands, auf die Mittelzeile hochgerechnet): Referenz ${f(E.K5raute.ref.breitePx)} px = ${f(E.K5raute.ref.breiteLw, 4)} Lw (${E.K5raute.ref.zeilen} Zeilen), Druck ${f(E.K5raute.druck.breitePx)} px = ${f(E.K5raute.druck.breiteLw, 4)} Lw (gefaltet, Info: ${f(E.K5raute.druckGefaltetInfo.breitePx)} px), Δ ${f(E.K5raute.dLwProz)} % Lw (≤ 2): ${j(E.K5raute.ok)}. In der Tabelle oben erfasst das Fenster EST-Raute im Druck auch die Strichenden; dort ist die Breite nur Info.`,
    `Flaggenstreifen in etikett.png (Mittelspalte, von oben): ${E.K5flagge.map(r => `${r.farbe} ${f(r.hoeheLhProz)} % Lh`).join(', ')}. 3 Streifen Schwarz-Rot-Gold: ${j(E.K5flaggeOk)}. K5: ${j(E.K5.every(r => r.ok) && E.K5flaggeOk && E.K5raute.ok)}.`,
    '', '### K8 Flach (etikett.png, volle Auflösung)',
    `Papier (Alpha 255, kein Druck, keine Berge; ${f(P.anteilFlaeche * 100, 1)} % der Fläche, ${P.n} px): Mittel ${P.mittel.map(v => f(v, 2)).join(' ')} (Soll ${C.PAPIER.join(' ')}), Standardabweichung ${P.sd.map(v => f(v, 4)).join(' / ')} = ${P.sdProz255.map(v => f(v, 4)).join(' / ')} % von 255.`,
    '| Element | Soll | Pixel (Druck deckend) | Mittel R G B | Standardabw. R / G / B |\n|---|---|---|---|---|',
    E.K8.elemente.map(e => `| ${e.name} | ${e.soll} | ${e.n} | ${e.mittel.map(v => f(v, 1)).join(' ')} | ${e.sd.map(v => f(v, 3)).join(' / ')} |`).join('\n'),
    `K8: ${j(E.K8.ok)}.`,
    '', '### K7 Kontrolle (ueberlagerung-logo.png, aus logo-werte.json neu gerechnet)',
    Object.entries(logoInfo).map(([k, v]) => `${k}: stroke-width ${f(v.strich, 2)}, Umriss p95 ${f(v.p95)} px, Max ${f(v.max)} px, Mittel ${f(v.mittel)} px.`).join(' '),
  ].join('\n');
}

function dateien(dir) { const o = []; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) o.push(...dateien(p)); else o.push(p); } return o; }

(async () => {
  const t0 = Date.now(); const log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(1).padStart(6) + 's', ...a);
  const werte = JSON.parse(fs.readFileSync(path.join(__dirname, 'satz-werte.json'), 'utf8'));
  fs.mkdirSync(ASSETS, { recursive: true });
  // 1 Logo und Bandzeichen (SVG + PNG)
  await LOGO.schreiben(LABEL, ASSETS); log('logo-band, zeichen-oben');
  // 2 Berge (RGBA in Groesse etikett.png)
  const bergeFile = path.join(LABEL, 'berge.png'); const { Q, up } = await B.bergePNG(bergeFile, PW, PH); log('berge.png', PW + 'x' + PH);
  // 3 druck.svg (nur Pfade, transparenter Grund)
  const druckSvg = D.druckSVG(werte); fs.writeFileSync(path.join(LABEL, 'druck.svg'), druckSvg + '\n');
  // 4 etikett.svg (verweist auf berge.png daneben); etikett.png = etikett.svg gerendert, Bildverweis als data-URI eingebettet
  const etSvg = etikettSVG(werte, 'berge.png'); fs.writeFileSync(path.join(LABEL, 'etikett.svg'), etSvg + '\n');
  const etRender = etSvg.replace('xlink:href="berge.png"', 'xlink:href="data:image/png;base64,' + fs.readFileSync(bergeFile).toString('base64') + '"');
  const et = await L.renderSVG(etRender, PW, PH); await png(et.d, PW, PH, 4).toFile(path.join(ASSETS, 'etikett.png')); log('druck.svg, etikett.svg, etikett.png');
  // 5 etikett-gold.png: Graustufenmaske (255 = Gold) der Farbgruppen gold, goldKlein, herat
  const goldIds = new Set(S.zeilen.filter(z => GOLD.includes(z.farbe)).map(z => z.id));
  const goldSvg = D.kopf() + `<rect x="0" y="0" width="${D.VW}" height="${D.VH}" fill="#000000"/>` + D.druckGruppe(werte, { nur: goldIds, fuell: () => '#ffffff' }) + '</svg>';
  const g = await L.renderSVG(goldSvg, PW, PH); const gm = Buffer.alloc(PW * PH); for (let k = 0; k < PW * PH; k++) gm[k] = g.d[k * 4];
  await png(gm, PW, PH, 1).toFile(path.join(ASSETS, 'etikett-gold.png')); log('etikett-gold.png');
  // 6 Pruefung
  if (PRUEF) {
    fs.mkdirSync(PRUEF, { recursive: true });
    await B.pruefung(PRUEF, Q, up, PW, PH); log('berge-vergleich, berge-entfernt, berge-messung');
    const { E, R, drR, RG, DG } = await endmessung(werte, etRender, druckSvg, et, up); log('Endmessung');
    await bildEtikett(path.join(PRUEF, 'ueberlagerung-etikett.png'), R, drR, RG, DG);
    const logoInfo = await bildLogo(path.join(PRUEF, 'ueberlagerung-logo.png'), R.img); log('Ueberlagerungen');
    fs.writeFileSync(path.join(PRUEF, 'endmessung.json'), JSON.stringify({ ...E, K7kontrolle: logoInfo }, null, 1));
    const mdFile = path.join(PRUEF, 'messung.md'), A = '<!-- ENDMESSUNG-D BEGIN -->', Z = '<!-- ENDMESSUNG-D END -->';
    let md = fs.existsSync(mdFile) ? fs.readFileSync(mdFile, 'utf8') : '# Messung\n'; const block = A + '\n' + mdAbschnitt(E, logoInfo) + '\n' + Z;
    md = md.includes(A) ? md.slice(0, md.indexOf(A)) + block + md.slice(md.indexOf(Z) + Z.length) : md.replace(/\s*$/, '\n\n') + block + '\n';
    fs.writeFileSync(mdFile, md);
    console.log('K1', E.K1.ok, 'K2', E.K2.every(r => r.ok), 'K3', E.K3.every(r => r.ok), 'K3el', E.K3el.filter(r => !r.ok).map(r => r.name).join('|'), 'K3hell', E.K3f.hell.filter(r => !r.ok).map(r => r.name + ' ' + r.abwProz).join('|') || 'alle ok', 'K3gr', E.K3f.gruppen.filter(r => !r.ok).map(r => r.gruppe + ' ' + r.abwProz.join('/')).join('|') || 'alle ok', 'K5', E.K5.every(r => r.ok) && E.K5flaggeOk, 'Raute', JSON.stringify(E.K5raute), 'K8', E.K8.ok);
  }
  // 7 SHA-256 aller Ausgaben (assets-src/label rekursiv + die vier PNGs in label-assets)
  const liste = [...dateien(LABEL), ...['etikett.png', 'etikett-gold.png', 'logo-band.png', 'zeichen-oben.png'].map(n => path.join(ASSETS, n))]
    .map(p => sha(fs.readFileSync(p)) + '  ' + path.relative(ROOT, p).split(path.sep).join('/')).sort((a, b) => { const x = a.slice(66), y = b.slice(66); return x < y ? -1 : x > y ? 1 : 0; });
  const gesamt = sha(liste.join('\n') + '\n');
  if (PRUEF) fs.writeFileSync(path.join(PRUEF, 'build-hashes.txt'), liste.join('\n') + '\n' + 'GESAMT  ' + gesamt + '\n');
  log('fertig, Dateien', liste.length, 'GESAMT', gesamt);
})().catch(e => { console.error(e); process.exit(1); });
