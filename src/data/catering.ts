// Catering catalogue as published on royalspices.de (checked 2026-09-28), without prices:
// prices are part of the individual quotation (client decision, 2026-10-05).

export type Dish = { name: string; detail: string };
export type Category = { title: string; intro: string; dishes: Dish[] };

export const categories: Category[] = [
  {
    title: 'Löffelgerichte',
    intro: 'Vor Ort angerichtet und auf Wunsch gangweise serviert.',
    dishes: [
      { name: 'Roastbeef', detail: 'Süßkartoffelcreme · Trüffeljus · Kräuterseitling' },
      { name: 'Vitello Tonnato', detail: 'Kapern · Rucola · Parmesan · Zitronenöl' },
      { name: 'Burrata', detail: 'Tomatentatar · Basilikum · Pinienkerne · Focaccia-Crunch' },
      { name: 'Tuna Tataki', detail: 'Ponzu · Algensalat · Sesam' },
      { name: 'Geröstete bunte Möhre', detail: 'Aufgeschlagener Feta · Granatapfel · Pistazie' },
    ],
  },
  {
    title: 'Signature Canapés',
    intro: 'Feine Happen für Empfänge und Veranstaltungen.',
    dishes: [
      { name: 'Roastbeef', detail: 'Sauce Tatar · Senf-Kaviar' },
      { name: 'Rotgarnele', detail: 'Avocado · Gemüsetatar · Mango' },
      { name: 'Räucherlachs', detail: 'Rote Bete · Frischkäse · Dill' },
      { name: 'Safran-Ziegenkäse', detail: 'Wildkräuter · Tomatenconfit' },
      { name: 'Französischer Brie', detail: 'Feigen · Walnuss · Honig' },
      { name: 'Basilikum-Hummus', detail: 'Aubergine · Zucchini · Paprika · vegan' },
      { name: 'Burrata', detail: 'Tomatentatar · Basilikum-Balsamico' },
    ],
  },
  {
    title: 'Exklusive Canapés',
    intro: 'Kaviar, Safran und Trüffel für besondere Anlässe.',
    dishes: [
      { name: 'Beluga-Kaviar', detail: 'Crème fraîche · Schnittlauch' },
      { name: 'Beef-Tatar', detail: 'Safran-Aioli' },
      { name: 'Kalbsfilet', detail: 'Trüffelremoulade · Schnittlauch' },
    ],
  },
  {
    title: 'Platten',
    intro: 'Für den Empfang oder zum gemeinsamen Genießen am Buffet.',
    dishes: [
      {
        name: 'Italienische Vorspeisenplatte',
        detail:
          'Zucchini · Aubergine · Balsamico-Pilze · Grillpaprika · Büffelmozzarella · Tomate · Pesto · Vitello Tonnato · Serrano-Schinken · Garnelen · Rucola · Parmesan',
      },
      { name: 'Fischplatte', detail: 'Graved Lachs mit Honig-Senf-Sauce · Räucherlachs mit Meerrettichsauce · Tuna Tataki mit Ponzu' },
      { name: 'Roastbeefplatte', detail: 'Kalt serviertes Roastbeef · Remoulade' },
      { name: 'Vegane Vorspeisenplatte', detail: 'Basilikum-Hummus · Grillgemüse · Falafel · Balsamico-Pilze · Oliven · Focaccia' },
    ],
  },
  {
    title: 'Vier-Gänge-Menü',
    intro: 'Persönlich zubereitet von Sajad Akrami. Für bis zu 100 Personen. Ein Menübeispiel:',
    dishes: [
      { name: '1. Gang · Tuna Tataki', detail: 'Wakame-Safran-Ponzu · Sesam' },
      { name: '2. Gang · Mungbohnen-Suppe', detail: 'Adive-Schaum' },
      { name: '3. Gang · Rinderfilet', detail: 'Safran-Kartoffelgratin · Wilder Brokkoli · Jus' },
      { name: '4. Gang · White-Chocolate-Safranmousse', detail: 'Rosenkirschen · Pistazieneis' },
    ],
  },
  {
    title: 'Mini-Desserts',
    intro: 'Sechs süße Kompositionen als Abschluss.',
    dishes: [
      { name: 'Cheesecake-Creme', detail: 'Karamellisierte Gerste · Himbeerconfit' },
      { name: 'Mousse au chocolat', detail: 'Crumble · Yuzu-Kirschen' },
      { name: 'Erdbeer-Ganache', detail: 'Brownie · Atsina-Kresse' },
      { name: 'Kokos-Espuma', detail: 'Honig-Tuile · Ananas · Minze' },
      { name: 'Safranmousse', detail: 'Rosenkirschen · Pistazien' },
      { name: 'Mango-Ganache', detail: 'Maracujaconfit · Weiße Schokolade' },
    ],
  },
];

export const packages = [
  { title: 'Empfang', size: '5 Happen pro Gast', parts: ['4 Signature Canapés', '1 Mini-Dessert'] },
  { title: 'Event', size: '9 Happen pro Gast', parts: ['3 Signature Canapés', '4 Löffelgerichte', '2 Mini-Desserts'] },
];

/** Dishes from the catalogue in which saffron is named as an ingredient. */
export const saffronDishes: Dish[] = [
  { name: 'Safran-Ziegenkäse', detail: 'Canapé mit Wildkräutern und Tomatenconfit' },
  { name: 'Beef-Tatar', detail: 'mit Safran-Aioli' },
  { name: 'Tuna Tataki', detail: 'mit Wakame-Safran-Ponzu' },
  { name: 'Rinderfilet', detail: 'mit Safran-Kartoffelgratin' },
  { name: 'Safranmousse', detail: 'mit Rosenkirschen und Pistazien' },
];
