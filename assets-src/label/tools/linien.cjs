'use strict';
// Einmalige Nachfuehrung (Teil D, nach anpassen.cjs, nicht Teil von build.cjs):
// Die Spitzen von "Linie links" (linkes Ende) und "Linie rechts" (rechtes Ende) laufen spitz aus und werden im
// Referenzmassstab duenner als in der Referenz, darum misst messen.cjs sie kuerzer (anpassen.cjs fuehrt Kanten nur
// um hoechstens 2 px nach). Hier wird nur das spitze Ende so verschoben, dass die gemessene Lage der Referenz entspricht.
// Aufruf: node linien.cjs   (schreibt satz-werte.json)
const path = require('path');
const fs = require('fs');
const D = require('./druck.cjs');
const M = require('./messen.cjs');
const { referenz } = require('./referenz.cjs');
const ENDEN = { 'Linie links': 0, 'Linie rechts': 1 }; // Index in box [u0,u1,v0,v1]

(async () => {
  const file = path.join(__dirname, 'satz-werte.json'); const werte = JSON.parse(fs.readFileSync(file, 'utf8'));
  const R = await referenz(); const ref = M.messeAlle(R.ratio).boxes; const set = new Set(Object.keys(ENDEN));
  for (let it = 0; it < 8; it++) {
    const m = M.messeAlle(await M.druckRatio(D.druckSVG(werte, { nur: set }), R.W, R.H), set).boxes; let maxd = 0;
    for (const [id, c] of Object.entries(ENDEN)) { const key = c === 0 ? 'u0' : 'u1', d = ref[id][key] - m[id][key]; maxd = Math.max(maxd, Math.abs(d));
      console.log(it, id, key, 'Ref', ref[id][key].toFixed(4), 'Druck', m[id][key].toFixed(4), 'Box', werte.elemente[id].box[c]);
      werte.elemente[id].box[c] = +(werte.elemente[id].box[c] + d).toFixed(5); }
    if (maxd * R.W < 0.05) break;
  }
  fs.writeFileSync(file, JSON.stringify(werte, null, 1));
})();
