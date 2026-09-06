// Kruising van trainerbeschikbaarheid en creditgeldigheid voor Personal
// Training — CLAUDE.md §5: "de klant ziet alleen tijdsloten die de kruising
// zijn van (a) zijn eigen creditgeldigheid en (b) de aangegeven
// beschikbaarheid van een trainer." Geen aparte locatie- of ruimtecheck.

import { db } from "@/lib/db";
import { geldigeCredits, rittenkaartStatus } from "@/lib/engine/credits";
import { amsterdamToUtc } from "@/lib/time";

export interface Tijdslot {
  trainerId: string;
  start: Date;
  eind: Date;
}

function datumReeks(van: Date, tot: Date): Date[] {
  const dagen: Date[] = [];
  for (let d = new Date(van); d <= tot; d.setDate(d.getDate() + 1)) {
    dagen.push(new Date(d));
  }
  return dagen;
}

/** Zet de losse TrainerAvailability-rijen om in concrete tijdvakken binnen [van, tot]. */
async function beschikbareVakken(trainerId: string, van: Date, tot: Date): Promise<Tijdslot[]> {
  const rijen = await db.trainerAvailability.findMany({
    where: { trainerId, active: true, startDate: { lte: tot }, OR: [{ endDate: null }, { endDate: { gte: van } }] },
  });

  const vakken: Tijdslot[] = [];
  for (const rij of rijen) {
    const weekdays: number[] = JSON.parse(rij.weekdays);
    for (const dag of datumReeks(van, tot)) {
      const isoDag = (dag.getDay() + 6) % 7; // 0 = maandag, zoals in het datamodel
      if (rij.frequency !== "EENMALIG" && !weekdays.includes(isoDag)) continue;
      const datumStr = dag.toISOString().slice(0, 10);
      const start = rij.allDay ? amsterdamToUtc(datumStr, "00:00") : amsterdamToUtc(datumStr, rij.startTime);
      const eind = rij.allDay ? amsterdamToUtc(datumStr, "23:59") : amsterdamToUtc(datumStr, rij.endTime);
      if (start >= van && start <= tot) vakken.push({ trainerId, start, eind });
    }
  }
  return vakken;
}

/**
 * Vrije PT-tijdsloten voor een klant bij een trainer: de kruising van de
 * vrijgegeven uren van die trainer en de geldigheidstermijn van de credit
 * (of rittenkaart) van de klant. Geboekte sloten filtert de agenda zelf uit
 * bij het daadwerkelijk boeken (booking.ts controleert de bezetting).
 */
export async function vrijeTijdslotenPT(userId: string, trainerId: string, van: Date, tot: Date): Promise<Tijdslot[]> {
  const [credits, kaart] = await Promise.all([geldigeCredits(userId, "PT", van), rittenkaartStatus(userId, van)]);

  const geldigTot = [...credits.map((c) => c.validUntil), kaart?.validUntil].filter(
    (d): d is Date => d instanceof Date,
  );
  if (geldigTot.length === 0) return [];
  const langsteGeldigheid = new Date(Math.max(...geldigTot.map((d) => d.getTime())));

  const grens = tot < langsteGeldigheid ? tot : langsteGeldigheid;
  if (grens < van) return [];

  return beschikbareVakken(trainerId, van, grens);
}
