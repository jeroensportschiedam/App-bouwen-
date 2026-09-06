// Seed vanuit de Trainin-export — zie CLAUDE.md §14 en BOUWOPDRACHT.md §7.
//
// Draait standaard tegen de echte export van 5 september 2026
// (prisma/seed-data/trainin-export-2026-09-05.csv). Geef een ander pad mee
// als eerste argument om tegen iets anders te draaien, bv. de fixture
// prisma/seed-data/trainin-export.example.csv die elke regel uit §14 in
// isolatie test (twee namen, geen product, onbekend product, dubbel product
// in één regel, jaarlijkse betaling, inactieve klant).
//
// Regels die dit script waarmaakt (CLAUDE.md §14):
// - Sleutel is de klantreferentie, niet de naam.
// - Idempotent: twee keer draaien levert geen dubbele klanten of abonnementen op.
// - Productnamen normaliseren via prisma/productmap.json (configuratie, geen code).
// - Dubbele abonnementen per klant weigeren, niet optellen — loggen voor controle.
// - Records zonder product (bij status "actief") en records op twee namen
//   komen in de ImportIssue-controlelijst, niet stilzwijgend in de app.
// - Inactieve klanten worden wel geïmporteerd, met status inactief.
//
// Twee dingen die pas bij het echte bestand aan het licht kwamen en die de
// eerdere fixture niet dekte:
// - Rittenkaarten (25 sessies / DUO) horen als Rittenkaart-record in de app,
//   niet als Subscription — maar zonder de ontbrekende "resterende credits"
//   en aankoopdatum (CLAUDE.md §14) zou elk geïmporteerd saldo gegokt zijn.
//   Daarom loggen we deze naar ImportIssue in plaats van een fout saldo te
//   verzinnen; zie RITTENKAART_ONBEKEND_SALDO hieronder.
// - Losse-tarief-producten (Losse Clubtraining / Losse privé training) zijn
//   per-boeking-afrekening, geen lopend abonnement (CLAUDE.md §4/§12) — die
//   slaan we dus niet op als Subscription.

import { PrismaClient, type PayMethod, type PayRhythm, type ProductGroup } from "@prisma/client";
import { readFileSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import productmapRaw from "./productmap.json";

const db = new PrismaClient();

const TRAININ_CSV_PATH =
  process.argv[2] ?? path.join(__dirname, "seed-data", "trainin-export-2026-09-05.csv");

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

// Trainin's eigen exportkolom heet "Klant ref.", niet "klantreferentie" —
// dit accepteert beide schrijfwijzen zodat een volgende export niet meteen
// een codewijziging vraagt.
const KOLOM_ALIASSEN: Record<string, string[]> = {
  voornaam: ["voornaam"],
  achternaam: ["achternaam"],
  klantreferentie: ["klant ref.", "klant ref", "klantreferentie", "klantreferentie."],
  productnaam: ["productnaam"],
  status: ["status"],
};

function leesCsv(pad: string): CsvRecord[] {
  const tekst = readFileSync(pad, "utf-8");
  const rijen = parseCsv(tekst);
  const [header, ...data] = rijen;
  const genormaliseerdeHeader = header.map((h) => h.trim().toLowerCase());
  const kolom = (naam: keyof typeof KOLOM_ALIASSEN) => {
    for (const alias of KOLOM_ALIASSEN[naam]) {
      const i = genormaliseerdeHeader.indexOf(alias);
      if (i !== -1) return i;
    }
    throw new Error(
      `Kolom "${naam}" ontbreekt in ${pad}. Verwacht een van: ${KOLOM_ALIASSEN[naam].join(", ")}. Gevonden kolommen: ${header.join(", ")}`,
    );
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

  // De controlelijst beschrijft de uitkomst van de laatste import, niet de
  // optelsom van alle keren dat de seed ooit gedraaid heeft. Bij elke run
  // dus opnieuw opbouwen — anders staat elk record er na drie deploys drie
  // keer in.
  await db.importIssue.deleteMany();

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
    const clubNiveaus: string[] = [];
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

      if (product.group === "LOS" || product.group === "GRATIS") {
        // Per-boeking-afrekening, geen lopend abonnement (CLAUDE.md §4/§12) — niets op te slaan.
        continue;
      }

      if (product.group === "KAART") {
        // Rittenkaart is een eigen pool (Rittenkaart-model), geen Subscription. Zonder de
        // resterende ritten en de aankoopdatum (CLAUDE.md §14, nog niet in de export) zou
        // elk saldo dat we hier verzinnen fout zijn — dus loggen voor handmatige invoer
        // in plaats van gokken.
        await logImportIssue(
          "RITTENKAART_ONBEKEND_SALDO",
          record,
          `Klant heeft "${genormaliseerd}", maar resterende ritten en vervaldatum ontbreken in de export — handmatig aanmaken in Rittenkaart.`,
        );
        continue;
      }

      if (product.group === "TRAJECT") {
        // Het Fundament plant 4 sessies op een vast tijdstip in (CLAUDE.md §5) — dat kan een
        // CSV-import niet zelf verzinnen, dus loggen voor handmatige start van het traject.
        await logImportIssue(
          "TRAJECT_NIET_GEIMPORTEERD",
          record,
          `Klant heeft "${genormaliseerd}", maar het Fundament Traject moet handmatig gestart worden (plant 4 vaste sessies).`,
        );
        continue;
      }

      if (product.group === "CLUB") clubNiveaus.push(genormaliseerd);

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

    if (clubNiveaus.length > 1) {
      // Vermoedelijk een upgrade/downgrade die in Trainin niet is opgeschoond, geen
      // bewuste keuze voor twee clubniveaus tegelijk — melden, niet zelf oplossen.
      await logImportIssue(
        "MEERDERE_CLUBNIVEAUS",
        record,
        `Klant heeft meerdere clubniveaus tegelijk: ${clubNiveaus.join(" + ")}. Waarschijnlijk een niet-opgeschoonde upgrade in Trainin — handmatig controleren welke moet blijven staan.`,
      );
    }

    geimporteerd++;
  }

  console.log(`Klanten verwerkt: ${geimporteerd} geïmporteerd, ${overgeslagen} op de controlelijst (zie ImportIssue).`);
  console.log(
    "Let op: e-mailadres, telefoonnummer, klant-sinds-datum en resterende credits ontbreken in deze export " +
      "(CLAUDE.md §14) — die velden staan leeg tot Trainin een aangepaste export levert.",
  );
}

// Testaccounts voor fase 1 (inloggen en rollen). Trainer- en eigenaaraccounts
// komen niet uit de Trainin-export (die kent alleen klanten) — CLAUDE.md §14
// zegt dat trainers en de eigenaar eigen accounts krijgen, gekoppeld aan hun
// e-mailadres.
//
// De wachtwoorden komen uit de omgeving (OWNER_PASSWORD / TRAINER_PASSWORD),
// nooit uit dit bestand: in de app staan echte klantnamen, en die app draait
// straks op een openbare URL. Staat een wachtwoord niet ingesteld, dan maken
// we het account liever niet aan dan met een zwak standaardwachtwoord.
//
// Een bestaand account krijgt hier nooit een nieuw wachtwoord: anders zet
// elke deploy het wachtwoord terug naar de waarde uit de omgeving.
const STAFF = [
  { email: "eigenaar@deimpactclub.nl", firstName: "Jeroen", lastName: "Sport", role: "OWNER" as const, envVar: "OWNER_PASSWORD" },
  { email: "trainer@deimpactclub.nl", firstName: "Fenna", lastName: "Trainer", role: "TRAINER" as const, envVar: "TRAINER_PASSWORD" },
];

async function seedStaff() {
  for (const s of STAFF) {
    const bestaat = await db.user.findUnique({ where: { email: s.email } });
    if (bestaat) {
      console.log(`Account ${s.email} bestaat al — wachtwoord ongemoeid gelaten.`);
      continue;
    }

    const wachtwoord = process.env[s.envVar];
    if (!wachtwoord || wachtwoord.length < 12) {
      console.warn(
        `Account ${s.email} NIET aangemaakt: zet ${s.envVar} (minimaal 12 tekens) in de omgeving en draai de seed opnieuw.`,
      );
      continue;
    }

    await db.user.create({
      data: {
        email: s.email,
        firstName: s.firstName,
        lastName: s.lastName,
        role: s.role,
        passwordHash: await bcrypt.hash(wachtwoord, 10),
        active: true,
      },
    });
    console.log(`Account aangemaakt: ${s.email} (${s.role === "OWNER" ? "eigenaar" : "trainer"}).`);
  }
}

async function main() {
  await seedProducten();
  await seedActiviteiten();
  await seedSettings();
  await seedStaff();
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
