// Eén centrale plek voor aanbod, prijzen en regels.
// Bron: bouwbrief CLAUDE.md, sectie 3. Verzin hier niets bij — bij twijfel navragen.

export const fundament = {
  naam: "Fundament Traject",
  duur: "4 weken",
  sessies: "4 privésessies",
  focus: "techniek, bewegingskwaliteit en zelfvertrouwen",
  prijs: 255,
  prijsLabel: "€255 eenmalig",
};

export type PakketId = "club-2x" | "club-3x" | "pt-club";

export interface Pakket {
  id: PakketId;
  naam: string;
  omschrijving: string;
  prijs: number;
  prijsLabel: string;
  uitgelicht?: boolean;
}

export const pakketten: Pakket[] = [
  {
    id: "club-2x",
    naam: "Club 2x per week",
    omschrijving: "Small Group Training, twee keer per week.",
    prijs: 200,
    prijsLabel: "€200 p/m",
  },
  {
    id: "club-3x",
    naam: "Club 3x per week",
    omschrijving: "Small Group Training, drie keer per week.",
    prijs: 300,
    prijsLabel: "€300 p/m",
    uitgelicht: true,
  },
  {
    id: "pt-club",
    naam: "PT + Club",
    omschrijving: "Persoonlijke training gecombineerd met Club Trainingen.",
    prijs: 375,
    prijsLabel: "€375 p/m",
  },
];

export const regels = {
  club: {
    afmelden: "12 uur",
    inhalen: "binnen 7 dagen",
  },
  pt: {
    afmelden: "24 uur",
    inhalen: "binnen 14 dagen",
  },
};

export const clubKenmerken = {
  maxGroep: 6,
  sessieduur: "45 minuten",
};

// Locatie als data, niet hard-coded — voorbereiding op meerdere vestigingen.
export const locaties = [
  {
    id: "schiedam",
    naam: "De Impact Club Schiedam",
    // Open punt: exacte adresgegevens en openingstijden nog te bevestigen door Jeroen.
    adres: "Schiedam — adres volgt",
    plaats: "Schiedam",
  },
];

// Juridische bedrijfsnaam — losse variabele, formele documenten lopen nog onder Jeroen Sport.
export const juridischeNaam = "Jeroen Sport V.O.F.";
