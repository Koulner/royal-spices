'use strict';
// Vektordruck als SVG-Pfade (keine <text>-Elemente). Koordinaten: viewBox 0 0 VW VH, VH = 1000 = Lh.
const path = require('path');
const fs = require('fs');
const L = require('./lib.cjs');
const S = require('./satz.cjs');
const C = L.C;
const VH = 1000, VW = +(VH * C.FORMAT.breiteZuHoehe).toFixed(3);
const f3 = v => (Math.round(v * 1000) / 1000).toString();

function fontFile(name, dirs) {
  for (const d of [path.resolve(__dirname, '../fonts'), ...(dirs || [])]) { const p = path.join(d, name); if (fs.existsSync(p)) return p; }
  throw new Error('Schrift fehlt: ' + name);
}
function farbe(key) { return L.hex(C.PAPIER.map((p, c) => p * C.VERHAELTNIS[key][c])); }

// Pfad eines Elements; w = { box:[u0,u1,v0,v1], font, wght }
function elementPfad(z, w, fontDirs) {
  const [u0, u1, v0, v1] = w.box; const x0 = u0 * VW, x1 = u1 * VW, y0 = v0 * VH, y1 = v1 * VH, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const P = pts => 'M' + pts.map(p => f3(p[0]) + ' ' + f3(p[1])).join('L') + 'Z';
  switch (z.art) {
    case 'text': return L.setLine(fontFile(w.font, fontDirs), w.wght, z.text, { x0, x1, y0, y1 }, w.mitten ? { mitten: w.mitten.map(u => u * VW), breiten: w.breiten.map(u => u * VW) } : {}).d;
    case 'raute': return P([[cx, y0], [x1, cy], [cx, y1], [x0, cy]]);
    case 'strich': return P([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
    case 'linie-l': return P([[x0, cy], [x1, y0], [x1, y1]]);
    case 'linie-r': return P([[x1, cy], [x0, y1], [x0, y0]]);
    case 'flagge': return P([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
  }
}
function flaggeSVG(w) {
  const [u0, u1, v0, v1] = w.box; const x0 = u0 * VW, x1 = u1 * VW, y0 = v0 * VH, h = (v1 - v0) * VH / 3; const F = C.FLAGGE;
  return ['schwarz', 'rot', 'gold'].map((k, i) => `<rect id="flagge-${k}" x="${f3(x0)}" y="${f3(y0 + i * h)}" width="${f3(x1 - x0)}" height="${f3(h + (i < 2 ? 0.02 : 0))}" fill="${L.hex(F[k])}"/>`).join('');
}
// opts: werte (satz-werte), nur (Set von ids), fuell (id -> Farbe ueberschreiben), fontDirs
function druckGruppe(werte, opts = {}) {
  let s = '';
  for (const z of S.zeilen) {
    if (opts.nur && !opts.nur.has(z.id)) continue; const w = werte.elemente[z.id]; if (!w) continue;
    if (z.art === 'flagge') { s += opts.fuell ? `<path d="${elementPfad(z, w)}" fill="${opts.fuell(z)}"/>` : `<g id="flagge">${flaggeSVG(w)}</g>`; continue; }
    const fill = opts.fuell ? opts.fuell(z) : farbe(z.farbe);
    s += `<path id="${z.id.replace(/[^A-Za-z0-9]+/g, '-')}" d="${elementPfad(z, w, opts.fontDirs)}" fill="${fill}"/>`;
  }
  return s;
}
const kopf = (extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="none" width="${VW}mm" height="${VH}mm"${extra}>`;
const eckR = () => C.FORMAT.eckradiusLw * VW;
function papierRect() { return `<rect id="papier" x="0" y="0" width="${VW}" height="${VH}" rx="${f3(eckR())}" ry="${f3(eckR())}" fill="${L.hex(C.PAPIER)}"/>`; }
function druckSVG(werte, opts = {}) { return kopf() + (opts.papier ? papierRect() : '') + druckGruppe(werte, opts) + '</svg>'; }

module.exports = { VW, VH, f3, fontFile, farbe, elementPfad, druckGruppe, druckSVG, papierRect, kopf, eckR };
