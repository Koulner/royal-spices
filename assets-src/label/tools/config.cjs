'use strict';
// Alle Stellschrauben an einer Stelle. Farben: Druckfarbe = PAPIER x VERHAELTNIS (je Kanal, sRGB 0..255).
module.exports = {
  PAPIER: [0xf0, 0xdd, 0xc9],            // Papierfarbe im Druckbild (Vorgabe #f0ddc9 = Referenzpapier x 1,043)

  // Verhaeltnis Druckfarbe / Papier je Kanal, gemessen in der Referenz (dunkelste 12 % je Element / Papiermittel)
  // (kalibriert mit anpassen.cjs: Druck im Referenzmassstab liefert dieselben dunkelsten 12 % wie die Referenz)
  VERHAELTNIS: {
    gold:      [0.5464, 0.4253, 0.1228], // ROYAL, SPICES, Linie mit Raute, EST-Raute (seit T-20261021-17)
    goldKlein: [0.5928, 0.4762, 0.1876], // EST., 2024, Striche neben der EST-Raute ("gold, matt")
    herat:     [0.5670, 0.4379, 0.1393], // HERAT NEGIN
    saffron:   [0.0918, 0.0773, 0.0030], // SAFFRON (schwarzgruen)
    braun:     [0.1587, 0.095, 0.068], // Striche um GRADE 1, PACKED IN GERMANY (GRADE 1 und 0,5 g seit T-20261021-19 in saffron)
    berge:     [0.4202, 0.3495, 0.2191], // Bergstriche bei voller Deckung (dunkelste 1 % der Bergzone), aus berge.cjs
    logo:      [0.8056, 0.7047, 0.4379], // Gold des Logos und des Bandzeichens: Median der Strichmitten (>= 2 px vom Maskenrand,
                                         // hellste 10 % als Reflexe verworfen) = #ae884a relativ zum Referenzpapier #d8c1a9 (T-20261020-10)
  },
  // Faltung K3 (c): Unschaerfe der Referenz (Gauss, px im Referenzmassstab), geschaetzt mit faltung.cjs (Kanten, erf-Anpassung);
  // das Druckbild im Referenzmassstab wird vor der K3-Messung mit sigmaZusatz = sqrt(sigmaRef^2 - sigmaDruck^2) gefaltet
  FALTUNG: { sigmaRef: 0.617, sigmaDruck: 0.247, sigmaZusatz: 0.565,
    // Modell (i) (T-20261020-15, Bewertung K3 (c)): messen.falteI = Luma-Gauss sigmaY plus WebP-Farbunterabtastung 4:2:0
    // (2 x 2-Mittel im Raster des Referenzbilds, Rueckweg 'fancy upsampling'). sigmaY nur aus Helligkeitskanten (faltung.json T-10):
    // sigmaY,ref = (Flagge 0,47 + SAFFRON 0,50) / 2 = 0,485; sigmaDruck = (0,20 + 0,30) / 2 = 0,25; sigmaY = sqrt(0,485^2 - 0,25^2) = 0,416.
    // sigmaZusatz = 0,565 (ein Gauss fuer alles, T-20261020-10) bleibt nur als Info-Spalte.
    // sigmaC (T-20261021-15): Chroma-Gauss auf Cb/Cr vor dem 2 x 2-Mittel, so gewaehlt, dass ROYAL R - B die Referenz 0,88 px trifft
    // (Abtastung in faltung.cjs, faltung.json modellIC). Gegenprobe HERAT NEGIN R - B, Flagge, SAFFRON: pruefung/faltung.md.
    modellI: { sigmaYRef: 0.485, sigmaYDruck: 0.25, sigmaY: 0.416, sigmaC: 1.5 } },
  FLAGGE: { schwarz: [0, 0, 0], rot: [0xdd, 0, 0], gold: [0xff, 0xce, 0x00] },

  FORMAT: { breiteZuHoehe: 0.7874, eckradiusLw: 0.0406, pngHoehe: 4096 },

  // Referenz und Fallback-Pfade (im Projekt werden die relativen Pfade benutzt)
  REF_FALLBACK: 'H:/royal-spices/royal-spices-v1/assets-src/photos/ref-glas-1910.webp',
  NODE_MODULES_FALLBACK: 'H:/royal-spices/royal-spices-v1/node_modules',

  // Suchbereiche fuer die Etikettkanten in der Referenz (Pixel): Abtastbereiche ohne Ecken, Band und Schale
  KANTEN: {
    oben: [[95, 185], [330, 415]], yOben: [270, 330],
    unten: [[150, 325]], yUnten: [740, 800],
    links: [[320, 740]], xLinks: [45, 110],
    rechts: [[320, 590]], xRechts: [395, 460],
  },
};
