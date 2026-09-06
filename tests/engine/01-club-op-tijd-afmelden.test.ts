// Scenario 1 (CLAUDE.md §5 / BOUWOPDRACHT §5): op tijd afmelden bij Club
// geeft een credit terug die 7 dagen geldig is.
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { boek, meldAf } from "@/lib/engine/booking";
import { dagenVanaf, geefCredit, maakActivity, maakLid, maakSessie, maakTrainer, urenVanaf } from "../helpers";

describe("scenario 1: op tijd afmelden bij Club", () => {
  it("geeft een credit terug die 7 dagen geldig is", async () => {
    const nu = new Date();
    const klant = await maakLid();
    const trainer = await maakTrainer();
    const activity = await maakActivity("CLUB");
    const sessie = await maakSessie({
      trainerId: trainer.id,
      activityId: activity.id,
      type: "CLUB",
      startsAt: dagenVanaf(3, nu), // ruim buiten het venster van 12 uur
    });
    await geefCredit({ userId: klant.id, kind: "CLUB", validFrom: nu, validUntil: dagenVanaf(30, nu) });

    const boeking = await boek(klant.id, sessie.id, nu);
    const afgemeld = await meldAf(boeking.id, klant.id, undefined, nu);

    expect(afgemeld.status).toBe("AFGEMELD");
    expect(afgemeld.creditReturned).toBe(true);

    const teruggegeven = await db.credit.findFirst({
      where: { userId: klant.id, origin: "TERUGGEGEVEN", kind: "CLUB" },
    });
    expect(teruggegeven).not.toBeNull();
    expect(teruggegeven!.validFrom.getTime()).toBe(nu.getTime());
    expect(teruggegeven!.validUntil.getTime()).toBe(urenVanaf(7 * 24, nu).getTime());
  });
});
