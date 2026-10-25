'use strict';
// Elemente des Frontetiketts.
//   win  = Messfenster [u0,u1,v0,v1] in Etikettbruchteilen (u nach rechts, v nach unten)
//   mode = Tintenmass der Messung ('gold' = Chroma R-B, 'dunkel' = 1 - Helligkeit, 'farbe' = Buntheit)
//   art  = text | raute | strich | linie-l | linie-r | flagge
//   farbe = Schluessel in config.VERHAELTNIS, rolle = Schriftrolle (Wahl in satz-werte.json)
// Die gesetzten Rahmen, Schriften und Gewichte stehen in satz-werte.json (erzeugt von anpassen.cjs, danach fest).
module.exports = {
  zeilen: [
    { id: 'EST.', art: 'text', text: 'EST.', rolle: 'klein', farbe: 'goldKlein', mode: 'gold', win: [0.17, 0.40, 0.125, 0.185] },
    { id: 'EST-Strich links', art: 'strich', thr: 0.3, prof: 'max', farbe: 'goldKlein', mode: 'gold', win: [0.42, 0.497, 0.138, 0.185] },
    { id: 'EST-Raute', art: 'raute', farbe: 'gold', mode: 'gold', win: [0.497, 0.537, 0.138, 0.185] },
    { id: 'EST-Strich rechts', art: 'strich', thr: 0.3, prof: 'max', farbe: 'goldKlein', mode: 'gold', win: [0.537, 0.62, 0.138, 0.185] },
    { id: '2024', art: 'text', text: '2024', rolle: 'klein', farbe: 'goldKlein', mode: 'gold', win: [0.62, 0.83, 0.125, 0.185] },
    { id: 'ROYAL', art: 'text', text: 'ROYAL', rolle: 'titel', farbe: 'gold', mode: 'gold', win: [0.17, 0.83, 0.190, 0.298] },
    { id: 'SPICES', art: 'text', text: 'SPICES', rolle: 'titel', farbe: 'gold', mode: 'gold', win: [0.17, 0.83, 0.298, 0.396] },
    { id: 'Linie links', art: 'linie-l', thr: 0.25, prof: 'max', farbe: 'gold', mode: 'gold', win: [0.14, 0.488, 0.405, 0.450] },
    { id: 'Raute', art: 'raute', farbe: 'gold', mode: 'gold', win: [0.488, 0.537, 0.398, 0.452] },
    { id: 'Linie rechts', art: 'linie-r', thr: 0.25, prof: 'max', farbe: 'gold', mode: 'gold', win: [0.537, 0.86, 0.405, 0.450] },
    { id: 'SAFFRON', art: 'text', text: 'SAFFRON', rolle: 'saffron', farbe: 'saffron', mode: 'dunkel', win: [0.09, 0.91, 0.455, 0.570] },
    { id: 'HERAT NEGIN', art: 'text', text: 'HERAT NEGIN', rolle: 'herat', farbe: 'herat', mode: 'gold', win: [0.19, 0.81, 0.580, 0.652] },
    { id: 'Strich links', art: 'strich', thr: 0.3, prof: 'max', farbe: 'braun', mode: 'dunkel', win: [0.28, 0.355, 0.655, 0.712] },
    { id: 'GRADE 1', art: 'text', text: 'GRADE 1', rolle: 'klein', farbe: 'saffron', mode: 'dunkel', win: [0.355, 0.645, 0.645, 0.712] },
    { id: 'Strich rechts', art: 'strich', thr: 0.3, prof: 'max', farbe: 'braun', mode: 'dunkel', win: [0.645, 0.72, 0.655, 0.712] },
    { id: '0,5 g', art: 'text', text: '0,5 g', rolle: 'klein', farbe: 'saffron', mode: 'dunkel', win: [0.38, 0.62, 0.735, 0.812] },
    { id: 'PACKED IN GERMANY', art: 'text', text: 'PACKED IN GERMANY', rolle: 'klein', farbe: 'braun', mode: 'dunkel', win: [0.25, 0.75, 0.812, 0.862] },
    { id: 'Flagge', art: 'flagge', mode: 'farbe', win: [0.38, 0.62, 0.885, 0.985] },
  ],
  // Zeilen fuer K2/K5 = Rahmen ueber mehrere Elemente
  gruppen: {
    'EST. ◆ 2024': ['EST.', 'EST-Strich links', 'EST-Raute', 'EST-Strich rechts', '2024'],
    'ROYAL': ['ROYAL'], 'SPICES': ['SPICES'],
    'Linie mit Raute': ['Linie links', 'Raute', 'Linie rechts'],
    'SAFFRON': ['SAFFRON'], 'HERAT NEGIN': ['HERAT NEGIN'],
    '— GRADE 1 —': ['Strich links', 'GRADE 1', 'Strich rechts'],
    '0,5 g': ['0,5 g'], 'PACKED IN GERMANY': ['PACKED IN GERMANY'], 'Flagge': ['Flagge'],
  },
  // Schriftkandidaten je Rolle (Google Fonts, OFL); Gewichte werden je Kandidat durchsucht
  kandidaten: {
    titel: ['Cinzel[wght].ttf', 'CormorantGaramond[wght].ttf', 'EBGaramond[wght].ttf'],
    saffron: ['Cinzel[wght].ttf', 'CormorantGaramond[wght].ttf', 'EBGaramond[wght].ttf'],
    herat: ['Montserrat[wght].ttf', 'Marcellus-Regular.ttf', 'Raleway[wght].ttf'],
    klein: ['Montserrat[wght].ttf', 'Raleway[wght].ttf', 'Mulish[wght].ttf'],
  },
};
