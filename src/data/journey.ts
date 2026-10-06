// The hero journey: CROCUS -> STIGMA -> SAFFRON -> ROYAL SPICES.
// Progress values follow the camera keys in pipeline/blender/web_hero.py; `at` is where the
// camera settles for the chapter, `from`/`to` is where its caption is on screen.

export type Chapter = {
  id: string;
  index: string;
  title: string;
  latin?: boolean;
  text: string;
  still: 'crocus' | 'stigma' | 'saffron' | 'jar';
  alt: string;
  from: number;
  to: number;
  at: number;
};

export const chapters: Chapter[] = [
  {
    id: 'crocus',
    index: '01',
    title: 'Crocus sativus',
    latin: true,
    text: 'Der Ursprung. Jede Blüte trägt drei rote Narben. Aus ihnen, und nur aus ihnen, entsteht Safran.',
    still: 'crocus',
    alt: 'Offene Safranblüte: violette Blütenblätter mit feinen Adern, gelbe Staubbeutel und rote Narbenäste.',
    from: 0.11,
    to: 0.3,
    at: 0.22,
  },
  {
    id: 'narbe',
    index: '02',
    title: 'Die Narbe',
    text: 'Zur Spitze hin weitet sie sich wie ein kleiner Trichter. Die Narben werden aus der Blüte gelöst und getrocknet.',
    still: 'stigma',
    alt: 'Ende eines frischen roten Narbenastes in Nahaufnahme: zur Spitze hin geweitet, längs gefurcht, mit feinem Rand aus Papillen, vor der unscharfen violetten Blüte.',
    from: 0.33,
    to: 0.47,
    at: 0.4,
  },
  {
    id: 'safran',
    index: '03',
    title: 'Safran',
    text: 'Getrocknet sind die Fäden dunkelrot, leicht gedreht und an der Spitze geweitet. An dieser Form erkennt man ganze Fäden.',
    still: 'saffron',
    alt: 'Getrocknete Safranfäden auf hellem Papier: dunkelrot, unregelmäßig gedreht, mit verbreiterten Enden.',
    from: 0.5,
    to: 0.64,
    at: 0.56,
  },
  {
    id: 'glas',
    index: '04',
    title: 'Im Glas',
    text: 'Royal Spices füllt die Fäden in Deutschland ab: ein Gramm im Glas, mit Naturkork verschlossen.',
    still: 'jar',
    alt: 'Royal-Spices-Glas mit Etikett „Saffron, Herat Negin, Grade 1, 1 g“, daneben Safranblüte und getrocknete Fäden.',
    from: 0.68,
    to: 0.87,
    at: 0.76,
  },
];

/** Progress stops for the "weiter" control and keyboard stepping. */
export const stops = [0, ...chapters.map((c) => c.at), 1];
