'use strict';
// Einmaliger Abgleich mit der Referenz (nicht Teil von build.cjs):
//  1. Elemente in der Referenz messen   2. je Schriftrolle Kandidaten x Gewichte setzen, Rahmen nachfuehren, IoU
//  3. beste Schrift je Rolle            4. Farben so kalibrieren, dass die dunkelsten 12 % im Referenzmassstab passen
// Ausgabe: satz-werte.json (fest, von build.cjs benutzt), Bericht + schriften-vergleich.png in <pruefdir>.
// Aufruf: node anpassen.cjs <pruefdir> [<kandidaten-schriftordner>]
const path = require('path');
const fs = require('fs');
const L = require('./lib.cjs');
const S = require('./satz.cjs');
const D = require('./druck.cjs');
const M = require('./messen.cjs');
const { referenz } = require('./referenz.cjs');
const C = L.C;
const PRUEF = path.resolve(process.argv[2] || '.');
const FONTDIRS = process.argv[3] ? [path.resolve(process.argv[3])] : [];
const GRUPPEN_FARBE = {}; for (const z of S.zeilen) if (z.farbe) (GRUPPEN_FARBE[z.farbe] = GRUPPEN_FARBE[z.farbe] || []).push(z.id);

(async () => {
  const R = await referenz(); const { W, H } = R;
  const ref = M.messeAlle(R.ratio); const RB = ref.boxes;
  for (const z of S.zeilen) { const b = RB[z.id], w = z.win, e = 0.6;
    const warn = Math.abs(b.u0 - w[0]) * W < e || Math.abs(b.u1 - w[1]) * W < e || Math.abs(b.v0 - w[2]) * H < e || Math.abs(b.v1 - w[3]) * H < e;
    console.log('REF', z.id.padEnd(18), [b.u0, b.u1, b.v0, b.v1].map(v => v.toFixed(4)).join(' '), warn ? 'RAND!' : ''); }
  // Startfarben = Referenzmessung
  for (const [g, ids] of Object.entries(GRUPPEN_FARBE)) C.VERHAELTNIS[g] = M.dunkel12(R.ratio, ref.I, RB, ids).map(v => Math.max(0, Math.min(1, v)));
  const werte = { elemente: {} };
  for (const z of S.zeilen) werte.elemente[z.id] = { box: [RB[z.id].u0, RB[z.id].u1, RB[z.id].v0, RB[z.id].v1] };

  async function nachfuehren(ids, iters) {
    const set = new Set(ids); let res;
    for (let it = 0; it <= iters; it++) {
      const ratio = await M.druckRatio(D.druckSVG(werte, { nur: set, fontDirs: FONTDIRS }), W, H);
      res = M.messeAlle(ratio, set); res.ratio = ratio;
      if (it === iters) break;
      for (const id of ids) { const e = werte.elemente[id], b = e.box, m = res.boxes[id], r = RB[id]; if (!isFinite(m.u0)) continue;
        const z0 = S.zeilen.find(q => q.id === id), wi = z0.win, rv = [r.u0, r.u1, r.v0, r.v1], mv = [m.u0, m.u1, m.v0, m.v1], px = [W, W, H, H];
        for (let c = 0; c < 4; c++) { if (Math.abs(rv[c] - wi[c]) * px[c] < 0.6) continue; // Kante am Fensterrand: nicht nachfuehren
          const st = Math.max(-0.5, Math.min(0.5, (rv[c] - mv[c]) * px[c])) / px[c]; b[c] = Math.max(rv[c] - 2 / px[c], Math.min(rv[c] + 2 / px[c], b[c] + st)); }
        if (b[1] - b[0] < 0.5 / W) b[1] = b[0] + 0.5 / W; if (b[3] - b[2] < 0.5 / H) b[3] = b[2] + 0.5 / H;
        if (e.mitten) { const z = S.zeilen.find(q => q.id === id); const pr = M.buchstaben(res.I[z.mode], z, m, e.mitten.length), rr = e.refRuns;
          if (pr) e.mitten = e.mitten.map((c, i) => c + (rr[i][0] + rr[i][1] - pr[i][0] - pr[i][1]) / 2); } }
    }
    return res;
  }
  // ---------- Schriftvergleich ----------
  const vergleich = {}; const bilder = [];
  for (const [rolle, files] of Object.entries(S.kandidaten)) {
    const ids = S.zeilen.filter(z => z.rolle === rolle).map(z => z.id); vergleich[rolle] = [];
    for (const file of files) {
      const fnt = L.fontkit.create(fs.readFileSync(D.fontFile(file, FONTDIRS))); const ax = fnt.variationAxes && fnt.variationAxes.wght;
      const ws = ax ? [] : [400]; if (ax) for (let v = Math.max(300, Math.ceil(ax.min / 100) * 100); v <= Math.min(900, ax.max); v += 100) ws.push(v);
      let best = null;
      for (const wg of ws) {
        for (const id of ids) { const e = werte.elemente[id], z = S.zeilen.find(q => q.id === id); e.font = file; e.wght = wg; e.box = [RB[id].u0, RB[id].u1, RB[id].v0, RB[id].v1];
          const n = L.shape(D.fontFile(file, FONTDIRS), wg, z.text).glyphs.filter(q => q.bb).length; const runs = M.buchstaben(ref.I[z.mode], z, RB[id], n);
          if (runs) { e.refRuns = runs; e.mitten = runs.map(r => (r[0] + r[1]) / 2); e.breiten = runs.map(r => r[1] - r[0]); } else { delete e.refRuns; delete e.mitten; delete e.breiten; } }
        const res = await nachfuehren(ids, 4);
        const per = ids.map(id => { const z = S.zeilen.find(q => q.id === id); return M.iou(ref.I[z.mode], res.I[z.mode], z.win).iou; });
        const score = per.reduce((a, b) => a + b, 0) / per.length;
        if (!best || score > best.score) best = { file, wght: wg, score, per, el: ids.map(id => JSON.parse(JSON.stringify(werte.elemente[id]))) };
      }
      vergleich[rolle].push(best);
      console.log(rolle.padEnd(8), file.padEnd(30), 'wght', best.wght, 'mitten', best.el.map(e => e.mitten ? 'j' : 'n').join(''), 'IoU', best.score.toFixed(3), best.per.map(v => v.toFixed(3)).join(' '));
    }
    vergleich[rolle].sort((a, b) => b.score - a.score);
    const win = vergleich[rolle][0]; ids.forEach((id, i) => { werte.elemente[id] = JSON.parse(JSON.stringify(win.el[i])); });
    // Vergleichsbild: Zeile je Kandidat (Referenz rot, Kandidat blau, beide schwarz)
    const showId = { titel: 'ROYAL', saffron: 'SAFFRON', herat: 'HERAT NEGIN', klein: 'GRADE 1' }[rolle]; const z = S.zeilen.find(q => q.id === showId);
    for (const cand of vergleich[rolle]) {
      const tmp = JSON.parse(JSON.stringify(werte)); ids.forEach((id, i) => { tmp.elemente[id] = cand.el[i]; });
      const ratio = await M.druckRatio(D.druckSVG(tmp, { nur: new Set([showId]), fontDirs: FONTDIRS }), W, H);
      const r = M.iou(ref.I[z.mode], M.inks(ratio)[z.mode], z.win, 4);
      bilder.push({ titel: `${rolle}: ${cand.file.replace(/\[wght\]\.ttf|\.ttf/, '')} ${cand.wght}  IoU ${cand.score.toFixed(3)} (Rolle)  ${showId}: ${r.iou.toFixed(3)}`, A: r.A, B: r.B });
    }
  }
  // ---------- alle Elemente gemeinsam nachfuehren ----------
  const alle = S.zeilen.map(z => z.id);
  await nachfuehren(alle, 6);
  // ---------- Farben kalibrieren ----------
  for (let it = 0; it < 4; it++) {
    const ratio = await M.druckRatio(D.druckSVG(werte, { fontDirs: FONTDIRS }), W, H); const P = M.messeAlle(ratio);
    for (const [g, ids] of Object.entries(GRUPPEN_FARBE)) {
      const tgt = M.dunkel12(R.ratio, ref.I, RB, ids), cur = M.dunkel12(ratio, P.I, P.boxes, ids), v = C.VERHAELTNIS[g];
      C.VERHAELTNIS[g] = v.map((x, c) => Math.max(0, Math.min(1, 1 - (1 - x) * Math.max(0, 1 - tgt[c]) / Math.max(1e-3, 1 - cur[c]))));
    }
  }
  await nachfuehren(alle, 2);
  for (const z of S.zeilen) { const e = werte.elemente[z.id]; e.box = e.box.map(v => +v.toFixed(5)); delete e.refRuns; for (const k of ['mitten', 'breiten']) if (e[k]) e[k] = e[k].map(v => +v.toFixed(5)); }
  for (const r of Object.values(vergleich)) for (const c of r) delete c.el;
  werte.verhaeltnis = Object.fromEntries(Object.entries(C.VERHAELTNIS).filter(([, v]) => v).map(([k, v]) => [k, v.map(x => +x.toFixed(4))]));
  fs.writeFileSync(path.join(__dirname, 'satz-werte.json'), JSON.stringify({ elemente: werte.elemente }, null, 1));
  fs.mkdirSync(PRUEF, { recursive: true });
  fs.writeFileSync(path.join(PRUEF, 'anpassen-bericht.json'), JSON.stringify({ vergleich, verhaeltnis: werte.verhaeltnis, quad: R.q, Lw: R.Lw, Lh: R.Lh, W, H, papierRef: R.paperMean }, null, 1));
  console.log('VERHAELTNIS', JSON.stringify(werte.verhaeltnis));
  // ---------- Bild ----------
  const pad = 30, cw = Math.max(...bilder.map(b => b.A.W)); let y = 0; const comp = [];
  for (const b of bilder) {
    const buf = Buffer.alloc(b.A.W * b.A.H * 3);
    for (let k = 0; k < b.A.o.length; k++) { const a = b.A.o[k] >= b.A.T, c = b.B.o[k] >= b.B.T; const col = a && c ? [30, 30, 30] : a ? [225, 60, 50] : c ? [50, 110, 230] : [255, 255, 255]; buf.set(col, k * 3); }
    comp.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${pad}"><text x="6" y="21" font-family="Arial" font-size="18">${b.titel}</text></svg>`), left: 0, top: y });
    comp.push({ input: await L.sharp(buf, { raw: { width: b.A.W, height: b.A.H, channels: 3 } }).png().toBuffer(), left: 0, top: y + pad }); y += pad + b.A.H + 10;
  }
  comp.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${pad}"><text x="6" y="21" font-family="Arial" font-size="18">rot = nur Referenz, blau = nur Kandidat, schwarz = beide (Referenzmassstab, 4x bilinear, Schwelle 50 %)</text></svg>`), left: 0, top: y }); y += pad;
  await L.sharp({ create: { width: cw, height: y, channels: 3, background: '#ffffff' } }).composite(comp).png().toFile(path.join(PRUEF, 'schriften-vergleich.png'));
})();
