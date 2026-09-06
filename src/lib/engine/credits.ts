// De creditpool-engine — zie CLAUDE.md §5. Elke credit is een eigen record
// met een eigen validUntil; verval is een afgeleide van die datum, berekend
// bij uitlezen. Er is geen cronjob die records "laat vervallen".

import type { Credit, CreditKind, PrismaClient, Product } from "@prisma/client";
import { db } from "@/lib/db";

type Client = Pick<PrismaClient, "credit" | "rittenkaart">;

/**
 * Alle credits van een klant van het gevraagde soort die op moment `op` nog
 * geldig zijn: nog niet besteed, en `op` valt in [validFrom, validUntil).
 * De grens is exclusief: een credit die exact op zijn validUntil staat, telt
 * niet meer mee (test 4 in tests/engine).
 */
export async function geldigeCredits(
  userId: string,
  kind: CreditKind,
  op: Date = new Date(),
  client: Client = db,
): Promise<Credit[]> {
  return client.credit.findMany({
    where: {
      userId,
      kind,
      spentOnBookingId: null,
      validFrom: { lte: op },
      validUntil: { gt: op },
    },
    orderBy: { validUntil: "asc" }, // eerst de credit die het eerst vervalt
  });
}

export interface Saldo {
  club: number;
  pt: number;
  eerstvolgendeVervaldatum: Date | null;
}

/**
 * De teller die zowel de trainersapp als de klantapp tonen. Er is precies
 * één implementatie hiervan — geen scherm rekent dit zelf uit (CLAUDE.md §5).
 */
export async function saldo(userId: string, op: Date = new Date(), client: Client = db): Promise<Saldo> {
  const [club, pt] = await Promise.all([
    geldigeCredits(userId, "CLUB", op, client),
    geldigeCredits(userId, "PT", op, client),
  ]);

  const eerstvolgendeVervaldatum = [...club, ...pt]
    .map((c) => c.validUntil)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  return {
    club: club.length,
    pt: pt.length,
    eerstvolgendeVervaldatum: eerstvolgendeVervaldatum ?? null,
  };
}

export interface Periode {
  start: Date;
  eind: Date;
}

/**
 * Kent periodieke credits toe bij de start van een abonnement en bij de
 * maandwissel. Aantal = sessiesPerWeek × aantal weken in de periode; elke
 * credit is geldig voor de hele periode (dezelfde periode waarvoor het
 * abonnement loopt).
 *
 * Aanname, niet expliciet vastgelegd in CLAUDE.md §5: de geldigheid van een
 * periodiek toegekende credit is de abonnementsperiode zelf. Alleen credits
 * die uit een afmelding terugkomen hebben de aparte 7/14-dagentermijn.
 */
export async function kenCreditsToe(
  userId: string,
  product: Pick<Product, "id" | "group" | "sessionsPerWeek">,
  periode: Periode,
  client: Client = db,
): Promise<Credit[]> {
  if (product.group !== "CLUB" && product.group !== "PT") {
    throw new Error(
      `Product ${product.id} is geen Club- of PT-abonnement; periodieke credits gelden alleen voor die twee groepen.`,
    );
  }
  const kind: CreditKind = product.group;
  const sessionsPerWeek = product.sessionsPerWeek ?? 0;
  const weken = Math.max(1, Math.ceil((periode.eind.getTime() - periode.start.getTime()) / (7 * 24 * 60 * 60 * 1000)));
  const aantal = sessionsPerWeek * weken;

  const credits: Credit[] = [];
  for (let i = 0; i < aantal; i++) {
    credits.push(
      await client.credit.create({
        data: {
          userId,
          kind,
          origin: "PERIODIEK",
          validFrom: periode.start,
          validUntil: periode.eind,
        },
      }),
    );
  }
  return credits;
}

/** Geeft een credit terug na tijdig afmelden. Geldigheid komt uit Setting (§12). */
export async function geefCreditTerug(
  userId: string,
  kind: CreditKind,
  vanaf: Date,
  geldigheidDagen: number,
  client: Client = db,
): Promise<Credit> {
  const validUntil = new Date(vanaf.getTime() + geldigheidDagen * 24 * 60 * 60 * 1000);
  return client.credit.create({
    data: {
      userId,
      kind,
      origin: "TERUGGEGEVEN",
      validFrom: vanaf,
      validUntil,
    },
  });
}

/** Status van een actieve rittenkaart, zoals de klant hem ziet: "18 van de 25 ritten over". */
export async function rittenkaartStatus(userId: string, op: Date = new Date(), client: Client = db) {
  const kaart = await client.rittenkaart.findFirst({
    where: { userId, validUntil: { gt: op } },
    orderBy: { validUntil: "asc" },
  });
  if (!kaart) return null;
  return {
    over: kaart.total - kaart.used,
    totaal: kaart.total,
    validUntil: kaart.validUntil,
  };
}
