// Seed vanuit de Trainin-export — zie CLAUDE.md §14 en BOUWOPDRACHT.md §7.
//
// LET OP: er is nog geen echte Trainin-export aangeleverd in dit project.
// Dit script draait tegen `prisma/seed-data/trainin-export.example.csv`, een
// fixture die elke regel uit §14 een keer raakt (twee namen, geen product,
// onbekend product, dubbel product in één regel, jaarlijkse betaling,
// inactieve klant). Zodra Jeroen de echte export van 5 september 2026
// aanlevert, zet het bestand op het pad in TRAININ_CSV_PATH hieronder (of
// geef het pad mee als eerste argument) en draai `npm run db:seed` opnieuw.
//
// Regels die dit script waarmaakt (CLAUDE.md §14):
// - Sleutel is de klantreferentie, niet de naam.
// - Idempotent: twee keer draaien levert geen dubbele klanten of abonnementen op.
// - Productnamen normaliseren via prisma/productmap.json (configuratie, geen code).
// - Dubbele abonnementen per klant weigeren, niet optellen — loggen voor controle.
// - Records zonder product (bij status "actief") en records op twee namen
//   komen in de ImportIssue-controlelijst, niet stilzwijgend in de app.
// - Inactieve klanten worden wel geïmporteerd, met status inactief.

import { PrismaClient, type PayMethod, type PayRhythm, type ProductGroup } from "@prisma/client";
import { readFileSync } from "node:fs";
import path from "node:path";
import productmapRaw from "./productmap.json";

const db = new PrismaClient();

const TRAININ_CSV_PATH =
  process.argv[2] ?? path.join(__dirname, "seed-data", "trainin-export.example.csv");

// De datum van de eerste export (CLAUDE.md §4/§14). Trainin levert geen
// startdatum per abonnement; zolang dat veld er niet is, gebruiken we deze
// vaste datum als placeholder zodat herhaald draaien dezelfde rij treft
// (@@unique([userId, productId, startDate]) in het schema) in plaats van
// telkens een nieuw abonnement aan te maken.
const ONBEKENDE_STARTDATUM = new Date("2026-09-05T00:00:00.000Z");

const productmap: Record<string, string> = Object.fromEntries(
  Object.entries(productmapRaw as Record<string, string>).filter(([key]) => key !== "_comment"),
);

interface ProductSeed {
  name: string;
  group: ProductGroup;
  description: string;
  sessionsPerWeek?: number;
  totalSessions?: number;
  priceCents: number;
  method: PayMethod;
  concept?: boolean;
  active?: boolean;
}

// Prijzen komen uit CLAUDE.md §4 en zijn NOG NIET BEVESTIGD DOOR JEROEN — de
// export bevat geen bedragen. Zie het open punt in BOUWOPDRACHT.md §10.2.
const PRODUCTEN: ProductSeed[] = [
  { name: "Clubtraining BASIS", group: "CLUB", description: "1x per week clubtraining", sessionsPerWeek: 1, priceCents: 7900, method: "INCASSO" },
  { name: "Clubtraining GROEI", group: "CLUB", description: "2x per week clubtraining", sessionsPerWeek: 2, priceCents: 10900, method: "INCASSO" },
  { name: "Clubtraining INTENS", group: "CLUB", description: "3x per week clubtraining", sessionsPerWeek: 3, priceCents: 12900, method: "INCASSO" },
  { name: "Personal Training 1× per week", group: "PT", description: "1x per week Personal Training", sessionsPerWeek: 1, priceCents: 22900, method: "INCASSO" },
  { name: "Personal Training 2× per week", group: "PT", description: "2x per week Personal Training", sessionsPerWeek: 2, priceCents: 42900, method: "INCASSO" },
  { name: "1 PT + 1 Club", group: "COMBI", description: "Combinatie van 1x PT en 1x Club per week — bestaat nog niet, in voorbereiding", priceCents: 27900, method: "INCASSO", concept: true, active: false },
  { name: "Rittenkaart PT, 25 sessies", group: "KAART", description: "25 PT-sessies, 12 maanden geldig", totalSessions: 25, priceCents: 137500, method: "EENMALIG" },
  // Prijs nog niet bepaald (open punt §10.1/§10.2) — placeholder tot Jeroen beslist of dit product blijft bestaan.
  { name: "DUO rittenkaart, 10 sessies", group: "KAART", description: "10 sessies, te delen door twee klanten — prijs en creditregel nog niet vastgesteld, zie BOUWOPDRACHT.md §10", totalSessions: 10, priceCents: 0, method: "EENMALIG", active: false },
  { name: "Fundament Traject", group: "TRAJECT", description: "4 begeleide trainingen in 4 weken, verplicht voor iedere nieuwe klant", totalSessions: 4, priceCents: 25500, method: "EENMALIG" },
  { name: "Losse clubtraining", group: "LOS", description: "Eén clubtraining, direct afgerekend bij het boeken", priceCents: 1750, method: "LOS" },
  { name: "Losse Personal Training", group: "LOS", description: "Eén Personal Training, direct afgerekend bij het boeken", priceCents: 6500, method: "LOS" },
];

interface ActivitySeed {
  name: string;
  type: "CLUB" | "PT" | "FUNDAMENT" | "INTAKE";
  minutes: number;
  capacity: number;
  dropInCents?: number;
}

const ACTIVITEITEN: ActivitySeed[] = [
  { name: "CORE | KRACHT", type: "CLUB", minutes: 60, capacity: 8 },
  { name: "HYBRID", type: "CLUB", minutes: 60, capacity: 8 },
  { name: "Personal Training", type: "PT", minutes: 60, capacity: 1, dropInCents: 6500 },
  { name: "Fundament", type: "FUNDAMENT", minutes: 60, capacity: 1 },
  { name: "Intake", type: "INTAKE", minutes: 20, capacity: 1 },
];

interface CsvRecord {
  voornaam: string;
  achternaam: string;
  klantreferentie: string;
  productnaam: string;
  status: string;
}

/** Kleine RFC4180-achtige parser: genoeg voor de vijf kolommen uit §14, met
 * ondersteuning voor aanhalingstekens rond velden die zelf komma's bevatten
 * (de kommagescheiden productenlijst). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      pushField();
    } else if (c === "\n") {
      if (field.length > 0 || row.length > 0) pushRow();
    } else if (c === "\r") {
      // negeren, Windows-regeleinden
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();
  return rows;
}

function leesCsv(pad: string): CsvRecord[] {
  const tekst = readFileSync(pad, "utf-8");
  const rijen = parseCsv(tekst);
  const [header, ...data] = rijen;
  const kolom = (naam: string) => {
    const i = header.indexOf(naam);
    if (i === -1) throw new Error(`Kolom "${naam}" ontbreekt in ${pad}. Verwacht: voornaam,achternaam,klantreferentie,productnaam,status`);
    return i;
  };
  const iVoornaam = kolom("voornaam");
  const iAchternaam = kolom("achternaam");
  const iRef = kolom("klantreferentie");
  const iProduct = kolom("productnaam");
  const iStatus = kolom("status");

  return data
    .filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""))
    .map((r) => ({
      voornaam: r[iVoornaam]?.trim() ?? "",
      achternaam: r[iAchternaam]?.trim() ?? "",
      klantreferentie: r[iRef]?.trim() ?? "",
      productnaam: r[iProduct]?.trim() ?? "",
      status: r[iStatus]?.trim().toLowerCase() ?? "",
    }));
}

async function logImportIssue(reason: string, record: CsvRecord, detail: string) {
  await db.importIssue.create({
    data: {
      trainingRef: record.klantreferentie || null,
      firstName: record.voornaam,
      lastName: record.achternaam,
      reason,
      detail,
      raw: JSON.stringify(record),
    },
  });
}

// CLAUDE.md §14 noemt expliciet het patroon "Johan & Angela" als voorbeeld
// van een record op twee namen. We herkennen alleen dat concrete patroon
// (een "&" in de voornaam) om geen namen met "en" erin per ongeluk te raken.
function isTweeNamen(record: CsvRecord): boolean {
  return record.voornaam.includes("&") || record.achternaam.includes("&");
}

function isJaarlijks(ruweProductnaam: string): boolean {
  return /jaarlijks/i.test(ruweProductnaam);
}

async function seedProducten() {
  for (const p of PRODUCTEN) {
    await db.product.upsert({
      where: { name: p.name },
      update: {
        group: p.group,
        description: p.description,
        sessionsPerWeek: p.sessionsPerWeek,
        totalSessions: p.totalSessions,
        priceCents: p.priceCents,
        method: p.method,
        concept: p.concept ?? false,
        active: p.active ?? true,
      },
      create: {
        name: p.name,
        group: p.group,
        description: p.description,
        sessionsPerWeek: p.sessionsPerWeek,
        totalSessions: p.totalSessions,
        priceCents: p.priceCents,
        method: p.method,
        concept: p.concept ?? false,
        active: p.active ?? true,
      },
    });
  }
  console.log(`Producten: ${PRODUCTEN.length} aangemaakt of bijgewerkt.`);
}

async function seedActiviteiten() {
  for (const a of ACTIVITEITEN) {
    await db.activity.upsert({
      where: { name: a.name },
      update: { type: a.type, minutes: a.minutes, capacity: a.capacity, dropInCents: a.dropInCents },
      create: { name: a.name, type: a.type, minutes: a.minutes, capacity: a.capacity, dropInCents: a.dropInCents },
    });
  }
  console.log(`Activiteiten: ${ACTIVITEITEN.length} aangemaakt of bijgewerkt.`);
}

async function seedSettings() {
  const { SETTING_DEFAULTS } = await import("../src/lib/engine/settings");
  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
    await db.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  console.log(`Settings: ${Object.keys(SETTING_DEFAULTS).length} defaults gezet (bestaande waarden blijven staan).`);
}

async function seedKlanten() {
  const records = leesCsv(TRAININ_CSV_PATH);
  console.log(`Trainin-export gelezen: ${records.length} regels uit ${TRAININ_CSV_PATH}`);

  let geimporteerd = 0;
  let overgeslagen = 0;

  for (const record of records) {
    if (!record.klantreferentie) {
      await logImportIssue("GEEN_KLANTREFERENTIE", record, "Regel heeft geen klantreferentie, kan niet als sleutel worden gebruikt.");
      overgeslagen++;
      continue;
    }

    if (isTweeNamen(record)) {
      await logImportIssue(
        "TWEE_NAMEN",
        record,
        "Record op twee namen — niet automatisch geïmporteerd zolang CLAUDE.md §4 punt 1 (DUO-training) niet is besloten.",
      );
      overgeslagen++;
      continue;
    }

    const actief = record.status === "actief";
    const ruweProducten = record.productnaam
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (ruweProducten.length === 0) {
      if (actief) {
        await logImportIssue(
          "GEEN_PRODUCT",
          record,
          "Actieve klant zonder product — krijgt geen account tot Jeroen beslist of dit product of inactief wordt (BOUWOPDRACHT.md §10.4).",
        );
        overgeslagen++;
        continue;
      }
      // Inactieve klant zonder product: gewoon importeren, geen abonnement nodig.
    }

    const user = await db.user.upsert({
      where: { trainingRef: record.klantreferentie },
      update: {
        firstName: record.voornaam,
        lastName: record.achternaam,
        active: actief,
      },
      create: {
        trainingRef: record.klantreferentie,
        firstName: record.voornaam,
        lastName: record.achternaam,
        active: actief,
        role: "MEMBER",
        // email, phone en memberSince ontbreken in de huidige export (CLAUDE.md §14).
      },
    });

    const gezien = new Set<string>();
    for (const ruw of ruweProducten) {
      const genormaliseerd = productmap[ruw];
      if (!genormaliseerd) {
        await logImportIssue("ONBEKEND_PRODUCT", record, `Onbekende productnaam "${ruw}" — nog niet in prisma/productmap.json.`);
        continue;
      }
      if (gezien.has(genormaliseerd)) {
        await logImportIssue(
          "DUBBEL_ABONNEMENT",
          record,
          `Product "${genormaliseerd}" komt dubbel voor in dit record — één keer verwerkt, niet opgeteld.`,
        );
        continue;
      }
      gezien.add(genormaliseerd);

      const product = await db.product.findUnique({ where: { name: genormaliseerd } });
      if (!product) {
        await logImportIssue("ONBEKEND_PRODUCT", record, `Product "${genormaliseerd}" staat niet in de productcatalogus.`);
        continue;
      }

      const rhythm: PayRhythm = isJaarlijks(ruw) ? "JAARLIJKS" : "MAANDELIJKS";
      await db.subscription.upsert({
        where: {
          userId_productId_startDate: {
            userId: user.id,
            productId: product.id,
            startDate: ONBEKENDE_STARTDATUM,
          },
        },
        update: { rhythm, active: actief },
        create: {
          userId: user.id,
          productId: product.id,
          rhythm,
          startDate: ONBEKENDE_STARTDATUM,
          active: actief,
        },
      });
    }

    geimporteerd++;
  }

  console.log(`Klanten verwerkt: ${geimporteerd} geïmporteerd, ${overgeslagen} op de controlelijst (zie ImportIssue).`);
  console.log(
    "Let op: e-mailadres, telefoonnummer, klant-sinds-datum en resterende credits ontbreken in deze export " +
      "(CLAUDE.md §14) — die velden staan leeg tot Trainin een aangepaste export levert.",
  );
}

async function main() {
  await seedProducten();
  await seedActiviteiten();
  await seedSettings();
  await seedKlanten();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
