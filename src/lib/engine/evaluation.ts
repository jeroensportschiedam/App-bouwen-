// Het advies na het Fundament Traject — CLAUDE.md §6. Weegt drie bronnen die
// de studio zelf al vult: het aanvraagformulier, de weeknotities en de
// cijfers. Geeft altijd de redenen mét bron terug, inclusief het citaat uit
// de notitie. Het advies is nooit een besluit — de trainer kiest.
//
// De precieze wegingen staan in Setting (§12) zodat Jeroen ze kan bijstellen.
// Twee aannames zijn hieronder expliciet gemaakt omdat CLAUDE.md ze niet
// vastlegt in getallen: de drempel voor "weinig ervaring" (leeg of
// "beginner"/"geen") en de trefwoorden waarop een weeknotitie als klacht
// telt. Beide staan in Setting, dus aanpasbaar zonder codewijziging.

import { db } from "@/lib/db";
import { getSettingNumber } from "@/lib/engine/settings";

export type AdviesKeuze = "club" | "pt" | "twijfel";
export type RedenSoort = "blessure" | "credit" | "nieuw" | "cijfer";

export interface AdviesReden {
  soort: RedenSoort;
  tekst: string;
  bron: string;
}

export interface AdviesNaTraject {
  keuze: AdviesKeuze;
  redenen: AdviesReden[];
  klachtenGenoteerd: boolean;
}

interface LeadFormData {
  ervaring?: string;
  blessures?: string;
}

interface WeekNote {
  week: number;
  authorId: string;
  text: string;
}

const KLACHT_TREFWOORDEN = ["klacht", "pijn", "blessure", "last van"];

export async function adviesNaTraject(userId: string): Promise<AdviesNaTraject> {
  const [traject, lead, bookingen] = await Promise.all([
    db.traject.findUniqueOrThrow({ where: { userId } }),
    db.lead.findFirst({ where: { convertedUserId: userId } }),
    db.booking.findMany({ where: { userId }, include: { session: true } }),
  ]);

  const redenen: AdviesReden[] = [];
  let puntenNaarPt = 0;
  let puntenNaarClub = 0;

  // 1. Het aanvraagformulier
  const form: LeadFormData = lead?.form ? JSON.parse(lead.form) : {};
  if (form.blessures && form.blessures.trim().length > 0) {
    redenen.push({ soort: "blessure", tekst: `Zelf opgegeven blessure: "${form.blessures}"`, bron: "aanvraagformulier" });
    puntenNaarPt += 1;
  }
  const weinigErvaring = !form.ervaring || /^(geen|beginner)/i.test(form.ervaring.trim());
  if (weinigErvaring) {
    redenen.push({ soort: "nieuw", tekst: "Weinig trainingservaring bij aanmelding.", bron: "aanvraagformulier" });
    puntenNaarPt += 1;
  } else {
    redenen.push({ soort: "nieuw", tekst: `Eerdere trainingservaring: "${form.ervaring}".`, bron: "aanvraagformulier" });
    puntenNaarClub += 1;
  }

  // 2. De notities per trainingsweek
  const weekNotes: WeekNote[] = traject.weekNotes ? JSON.parse(traject.weekNotes) : [];
  let klachtenGenoteerd = false;
  for (const note of weekNotes) {
    const heeftKlacht = KLACHT_TREFWOORDEN.some((woord) => note.text.toLowerCase().includes(woord));
    if (heeftKlacht) {
      klachtenGenoteerd = true;
      redenen.push({
        soort: "blessure",
        tekst: `Klacht genoteerd in week ${note.week}: "${note.text}"`,
        bron: `weeknotitie week ${note.week}`,
      });
      puntenNaarPt += 2; // zwaarst wegend, zie CLAUDE.md §6
    }
    if (/zelfstandig|techniek.*(voldoende|goed)/i.test(note.text)) {
      redenen.push({
        soort: "cijfer",
        tekst: `Techniek en zelfstandigheid beoordeeld in week ${note.week}: "${note.text}"`,
        bron: `weeknotitie week ${note.week}`,
      });
      puntenNaarClub += 1;
    }
  }

  // 3. De cijfers: aanwezigheid en annuleringspercentage tijdens het traject
  const trajectBookingen = bookingen.filter(
    (b) => b.session.startsAt >= traject.startedAt && (!traject.finishedAt || b.session.startsAt <= traject.finishedAt),
  );
  if (trajectBookingen.length > 0) {
    const aanwezig = trajectBookingen.filter((b) => b.status === "AANWEZIG").length;
    const afgemeld = trajectBookingen.filter((b) => b.status === "AFGEMELD").length;
    const aanwezigheidPct = Math.round((aanwezig / trajectBookingen.length) * 100);
    const annuleringPct = Math.round((afgemeld / trajectBookingen.length) * 100);

    const annuleringDrempel = await getSettingNumber("evaluatie.annuleringsdrempel.pct");
    const aanwezigheidDrempel = await getSettingNumber("evaluatie.aanwezigheidDrempel.pct");

    if (annuleringPct > annuleringDrempel) {
      redenen.push({
        soort: "cijfer",
        tekst: `Annulering ${annuleringPct}% tijdens het Fundament, boven de drempel van ${annuleringDrempel}%.`,
        bron: "aanwezigheidscijfers",
      });
      puntenNaarPt += 1;
    } else if (aanwezigheidPct >= aanwezigheidDrempel) {
      redenen.push({
        soort: "cijfer",
        tekst: `Aanwezigheid ${aanwezigheidPct}% tijdens het Fundament.`,
        bron: "aanwezigheidscijfers",
      });
      puntenNaarClub += 1;
    }
  }

  let keuze: AdviesKeuze = "twijfel";
  if (puntenNaarPt > puntenNaarClub) keuze = "pt";
  else if (puntenNaarClub > puntenNaarPt) keuze = "club";

  return { keuze, redenen, klachtenGenoteerd };
}
