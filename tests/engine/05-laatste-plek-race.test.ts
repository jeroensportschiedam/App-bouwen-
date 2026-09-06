// Scenario 5: twee klanten boeken tegelijk de laatste plek — precies één
// slaagt. De bezetting wordt binnen dezelfde transactie gecontroleerd als
// waarin de boeking wordt aangemaakt, dus er kan nooit worden overboekt.
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { BoekingsFout, boek } from "@/lib/engine/booking";
import { dagenVanaf, geefCredit, maakActivity, maakLid, maakSessie, maakTrainer } from "../helpers";

describe("scenario 5: race om de laatste plek", () => {
  it("laat precies één van twee gelijktijdige boekingen slagen", async () => {
    const nu = new Date();
    const klantA = await maakLid();
    const klantB = await maakLid();
    const trainer = await maakTrainer();
    const activity = await maakActivity("CLUB");
    const sessie = await maakSessie({
      trainerId: trainer.id,
      activityId: activity.id,
      type: "CLUB",
      startsAt: dagenVanaf(3, nu),
      capacity: 1, // nog maar één plek vrij
    });
    await geefCredit({ userId: klantA.id, kind: "CLUB", validFrom: nu, validUntil: dagenVanaf(30, nu) });
    await geefCredit({ userId: klantB.id, kind: "CLUB", validFrom: nu, validUntil: dagenVanaf(30, nu) });

    const resultaten = await Promise.allSettled([
      boek(klantA.id, sessie.id, nu),
      boek(klantB.id, sessie.id, nu),
    ]);

    const geslaagd = resultaten.filter((r) => r.status === "fulfilled");
    const gefaald = resultaten.filter((r) => r.status === "rejected");
    expect(geslaagd).toHaveLength(1);
    expect(gefaald).toHaveLength(1);
    expect((gefaald[0] as PromiseRejectedResult).reason).toBeInstanceOf(BoekingsFout);

    const bezetting = await db.booking.count({ where: { sessionId: sessie.id, status: { not: "AFGEMELD" } } });
    expect(bezetting).toBe(1);
  });
});
