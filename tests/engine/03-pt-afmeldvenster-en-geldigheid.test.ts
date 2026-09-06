// Scenario 3: hetzelfde als scenario 1 en 2, maar dan voor Personal
// Training: 24 uur van tevoren afmelden, credit 14 dagen geldig.
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { BoekingsFout, boek, kanZelfAfmelden, meldAf } from "@/lib/engine/booking";
import { dagenVanaf, geefCredit, maakActivity, maakLid, maakSessie, maakTrainer, urenVanaf } from "../helpers";

describe("scenario 3: PT — 24 uur afmelden, 14 dagen geldig", () => {
  it("geeft op tijd (buiten 24 uur) een credit terug die 14 dagen geldig is", async () => {
    const nu = new Date();
    const klant = await maakLid();
    const trainer = await maakTrainer();
    const activity = await maakActivity("PT");
    const sessie = await maakSessie({
      trainerId: trainer.id,
      activityId: activity.id,
      type: "PT",
      startsAt: dagenVanaf(3, nu),
    });
    await geefCredit({ userId: klant.id, kind: "PT", validFrom: nu, validUntil: dagenVanaf(30, nu) });

    const boeking = await boek(klant.id, sessie.id, nu);
    const afgemeld = await meldAf(boeking.id, klant.id, undefined, nu);

    expect(afgemeld.creditReturned).toBe(true);
    const teruggegeven = await db.credit.findFirst({ where: { userId: klant.id, origin: "TERUGGEGEVEN", kind: "PT" } });
    expect(teruggegeven!.validUntil.getTime()).toBe(urenVanaf(14 * 24, nu).getTime());
  });

  it("blokkeert de klant binnen 24 uur en geeft geen credit terug", async () => {
    const nu = new Date();
    const klant = await maakLid();
    const trainer = await maakTrainer();
    const activity = await maakActivity("PT");
    const sessie = await maakSessie({
      trainerId: trainer.id,
      activityId: activity.id,
      type: "PT",
      startsAt: urenVanaf(20, nu), // binnen 24 uur, buiten het clubvenster van 12 uur
    });
    await geefCredit({ userId: klant.id, kind: "PT", validFrom: nu, validUntil: dagenVanaf(30, nu) });

    const boeking = await boek(klant.id, sessie.id, nu);
    const check = await kanZelfAfmelden(boeking, sessie, nu);
    expect(check.mag).toBe(false);
    expect(check.reden).toContain("24 uur");

    await expect(meldAf(boeking.id, klant.id, undefined, nu)).rejects.toThrow(BoekingsFout);

    const afgemeld = await meldAf(boeking.id, trainer.id, undefined, nu);
    expect(afgemeld.creditReturned).toBe(false);
    const teruggegeven = await db.credit.findFirst({ where: { userId: klant.id, origin: "TERUGGEGEVEN" } });
    expect(teruggegeven).toBeNull();
  });
});
