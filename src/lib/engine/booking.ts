// Boeken, afmelden en de vrije-plek-melding — zie CLAUDE.md §5 en §6.
//
// Harde eisen die dit bestand waarmaakt:
// - Boeken en afmelden zijn één transactie: credit verbruiken/teruggeven en
//   de plek claimen/vrijgeven gebeuren atomisch, nooit overboeken.
// - Club: 12 uur van tevoren afmelden, credit 7 dagen geldig.
//   PT: 24 uur van tevoren, credit 14 dagen geldig.
//   Deze getallen komen uit Setting, niet uit code.
// - Rittenkaart is een eigen pool zonder weekritme en zonder vervaldatum per rit.

import type { Booking, CreditKind, Session, SessionType } from "@prisma/client";
import { db } from "@/lib/db";
import { geldigeCredits, geefCreditTerug as maakTeruggegevenCredit } from "@/lib/engine/credits";
import { getSettingNumber } from "@/lib/engine/settings";
import { hoursBetween } from "@/lib/time";

/** Concrete, bruikbare foutmelding — nooit "er ging iets mis" (BOUWOPDRACHT §8). */
export class BoekingsFout extends Error {}

function creditKindVoorSessie(type: SessionType): CreditKind | null {
  if (type === "CLUB") return "CLUB";
  if (type === "PT") return "PT";
  return null; // FUNDAMENT en INTAKE lopen buiten de creditpool
}

async function afmeldvensterUren(type: SessionType): Promise<number> {
  if (type === "PT") return getSettingNumber("afmeldvenster.pt.uren");
  return getSettingNumber("afmeldvenster.club.uren");
}

async function geldigheidDagenTerug(type: SessionType): Promise<number> {
  if (type === "PT") return getSettingNumber("geldigheid.pt.dagen");
  return getSettingNumber("geldigheid.club.dagen");
}

/**
 * Boekt een plek in een sessie. Binnen één transactie:
 * 1. bezetting tellen en tegen de capaciteit toetsen,
 * 2. een geldige credit (of rittenkaart-rit) claimen,
 * 3. de boeking aanmaken.
 * Faalt één van deze stappen, dan faalt de hele boeking.
 */
export async function boek(userId: string, sessionId: string, op: Date = new Date()): Promise<Booking> {
  return db.$transaction(async (tx) => {
    const session = await tx.session.findUnique({ where: { id: sessionId } });
    if (!session || session.cancelled) {
      throw new BoekingsFout("Deze sessie bestaat niet meer of is geannuleerd. Kies een andere sessie.");
    }

    const bezet = await tx.booking.count({
      where: { sessionId, status: { not: "AFGEMELD" } },
    });
    if (bezet >= session.capacity) {
      throw new BoekingsFout(
        "Deze sessie zit vol. Zet een melding aan voor een vrijgekomen plek, of kies een ander moment.",
      );
    }

    const bestaat = await tx.booking.findUnique({
      where: { userId_sessionId: { userId, sessionId } },
    });
    if (bestaat && bestaat.status !== "AFGEMELD") {
      throw new BoekingsFout("Je staat al ingeschreven voor deze sessie.");
    }

    const kind = creditKindVoorSessie(session.type);

    if (kind === null) {
      // Fundament en intake: geen credit nodig, geen credit verbruikt.
      return tx.booking.create({ data: { userId, sessionId, status: "OPEN" } });
    }

    // PT kan ook uit een rittenkaart komen; die pool heeft voorrang zolang hij geldig is.
    if (kind === "PT") {
      const kaart = await tx.rittenkaart.findFirst({
        where: { userId, validUntil: { gt: op } },
        orderBy: { validUntil: "asc" },
      });
      if (kaart && kaart.used + kaart.perSession <= kaart.total) {
        await tx.rittenkaart.update({
          where: { id: kaart.id },
          data: { used: { increment: kaart.perSession } },
        });
        return tx.booking.create({
          data: { userId, sessionId, status: "OPEN", rittenkaartId: kaart.id },
        });
      }
    }

    const credits = await geldigeCredits(userId, kind, op, tx);
    const credit = credits[0];
    if (!credit) {
      throw new BoekingsFout(
        kind === "PT"
          ? "Je hebt geen geldige PT-credit meer. Boek een losse Personal Training bij om toch te trainen."
          : "Je hebt geen geldige credit meer. Boek een losse clubtraining bij om toch te trainen.",
      );
    }

    const booking = await tx.booking.create({
      data: { userId, sessionId, status: "OPEN", creditId: credit.id },
    });
    await tx.credit.update({ where: { id: credit.id }, data: { spentOnBookingId: booking.id } });
    return booking;
  });
}

export interface AfmeldCheck {
  mag: boolean;
  reden?: string;
  urenTotStart: number;
}

/** Mag de klant zelf nog afmelden? Zie CLAUDE.md §5: 12u Club, 24u PT/rittenkaart. */
export async function kanZelfAfmelden(
  booking: Pick<Booking, "status">,
  session: Pick<Session, "type" | "startsAt">,
  op: Date = new Date(),
): Promise<AfmeldCheck> {
  const urenTotStart = hoursBetween(op, session.startsAt);

  if (booking.status === "AFGEMELD") {
    return { mag: false, reden: "Je bent al afgemeld voor deze sessie.", urenTotStart };
  }

  const venster = await afmeldvensterUren(session.type);
  if (urenTotStart < venster) {
    return {
      mag: false,
      reden: `Afmelden kan tot ${venster} uur voor de training. Bel de studio als het echt niet lukt.`,
      urenTotStart,
    };
  }
  return { mag: true, urenTotStart };
}

/**
 * Meldt een boeking af. `geefCreditTerug`, indien meegegeven, is de expliciete
 * keuze van de trainer of eigenaar buiten het venster (CLAUDE.md §6: "kiest
 * expliciet of de credit terugkomt"). Meldt de klant zichzelf af, dan geldt
 * altijd de automatische regel — dat pad hoort na een geslaagde
 * `kanZelfAfmelden`-check te lopen.
 */
export async function meldAf(
  bookingId: string,
  doorUserId: string,
  geefCreditTerug?: boolean,
  op: Date = new Date(),
): Promise<Booking> {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new BoekingsFout("Deze boeking bestaat niet.");
    if (booking.status === "AFGEMELD") {
      throw new BoekingsFout("Deze boeking is al afgemeld.");
    }

    const session = await tx.session.findUniqueOrThrow({ where: { id: booking.sessionId } });
    const urenTotStart = hoursBetween(op, session.startsAt);
    const venster = await afmeldvensterUren(session.type);
    const optijd = urenTotStart >= venster;

    const isZelf = doorUserId === booking.userId;
    if (isZelf && !optijd) {
      throw new BoekingsFout(
        `Afmelden kan tot ${venster} uur voor de training. Bel de studio als het echt niet lukt.`,
      );
    }

    // Standaard: aan binnen het venster, uit erbuiten — tenzij expliciet overruled.
    const creditTerug = geefCreditTerug ?? optijd;

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "AFGEMELD",
        cancelledAt: op,
        cancelledById: doorUserId,
        creditReturned: creditTerug,
      },
    });

    if (booking.rittenkaartId) {
      if (creditTerug) {
        // De rit blijft gewoon staan: terugdraaien wat bij het boeken is afgeschreven.
        const kaart = await tx.rittenkaart.findUniqueOrThrow({ where: { id: booking.rittenkaartId } });
        await tx.rittenkaart.update({
          where: { id: booking.rittenkaartId },
          data: { used: { decrement: kaart.perSession } },
        });
      }
      // Te laat: de rit is verbruikt, dus niets terugdraaien.
      return updated;
    }

    if (creditTerug) {
      const kind = creditKindVoorSessie(session.type);
      if (kind) {
        const dagen = await geldigheidDagenTerug(session.type);
        await maakTeruggegevenCredit(booking.userId, kind, op, dagen, tx);
      }
    }

    return updated;
  });
}

/**
 * Klanten met een geldige credit van het juiste soort die nog niet in deze
 * sessie zitten en meldingen over vrije plekken aan hebben staan. Wie het
 * eerst boekt, heeft de plek (CLAUDE.md §6).
 */
export async function vrijePlekKandidaten(sessionId: string, op: Date = new Date()) {
  const session = await db.session.findUniqueOrThrow({ where: { id: sessionId } });
  const kind = creditKindVoorSessie(session.type);
  if (!kind) return [];

  const alIngeschreven = await db.booking.findMany({
    where: { sessionId, status: { not: "AFGEMELD" } },
    select: { userId: true },
  });
  const uitgesloten = new Set(alIngeschreven.map((b) => b.userId));

  const kandidaten = await db.user.findMany({
    where: {
      active: true,
      notifyFreeSpot: true,
      id: { notIn: [...uitgesloten] },
    },
  });

  const metGeldigeCredit = await Promise.all(
    kandidaten.map(async (user) => {
      if (kind === "PT") {
        const kaart = await db.rittenkaart.findFirst({ where: { userId: user.id, validUntil: { gt: op } } });
        if (kaart && kaart.used < kaart.total) return user;
      }
      const credits = await geldigeCredits(user.id, kind, op);
      return credits.length > 0 ? user : null;
    }),
  );

  return metGeldigeCredit.filter((u): u is NonNullable<typeof u> => u !== null);
}
