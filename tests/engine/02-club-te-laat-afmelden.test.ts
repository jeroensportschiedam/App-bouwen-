// Scenario 2: te laat afmelden bij Club geeft geen credit terug en de knop
// is voor de klant geblokkeerd.
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { BoekingsFout, boek, kanZelfAfmelden, meldAf } from "@/lib/engine/booking";
import { dagenVanaf, geefCredit, maakActivity, maakLid, maakSessie, maakTrainer, urenVanaf } from "../helpers";

describe("scenario 2: te laat afmelden bij Club", () => {
  it("blokkeert de klant en geeft geen credit terug, ook niet als de trainer afmeldt", async () => {
    const nu = new Date();
    const klant = await maakLid();
    const trainer = await maakTrainer();
    const activity = await maakActivity("CLUB");
    const sessie = await maakSessie({
      trainerId: trainer.id,
      activityId: activity.id,
      type: "CLUB",
      startsAt: urenVanaf(2, nu), // binnen het venster van 12 uur
    });
    await geefCredit({ userId: klant.id, kind: "CLUB", validFrom: nu, validUntil: dagenVanaf(30, nu) });

    const boeking = await boek(klant.id, sessie.id, nu);

    const check = await kanZelfAfmelden(boeking, sessie, nu);
    expect(check.mag).toBe(false);
    expect(check.reden).toContain("12 uur");

    await expect(meldAf(boeking.id, klant.id, undefined, nu)).rejects.toThrow(BoekingsFout);

    // De trainer mag buiten het venster wel afmelden, en kiest hier expliciet
    // om geen credit terug te geven (CLAUDE.md §6: standaard uit erbuiten).
    const afgemeld = await meldAf(boeking.id, trainer.id, undefined, nu);
    expect(afgemeld.status).toBe("AFGEMELD");
    expect(afgemeld.creditReturned).toBe(false);

    const teruggegeven = await db.credit.findFirst({ where: { userId: klant.id, origin: "TERUGGEGEVEN" } });
    expect(teruggegeven).toBeNull();
  });
});
