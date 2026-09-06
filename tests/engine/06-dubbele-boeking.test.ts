// Scenario 6: dezelfde klant kan zich niet twee keer in één sessie boeken.
import { describe, expect, it } from "vitest";
import { BoekingsFout, boek } from "@/lib/engine/booking";
import { dagenVanaf, geefCredit, maakActivity, maakLid, maakSessie, maakTrainer } from "../helpers";

describe("scenario 6: dubbele boeking", () => {
  it("weigert een tweede boeking van dezelfde klant in dezelfde sessie", async () => {
    const nu = new Date();
    const klant = await maakLid();
    const trainer = await maakTrainer();
    const activity = await maakActivity("CLUB");
    const sessie = await maakSessie({
      trainerId: trainer.id,
      activityId: activity.id,
      type: "CLUB",
      startsAt: dagenVanaf(3, nu),
      capacity: 8,
    });
    await geefCredit({ userId: klant.id, kind: "CLUB", validFrom: nu, validUntil: dagenVanaf(30, nu) });

    await boek(klant.id, sessie.id, nu);
    await expect(boek(klant.id, sessie.id, nu)).rejects.toThrow(BoekingsFout);
    await expect(boek(klant.id, sessie.id, nu)).rejects.toThrow("al ingeschreven");
  });
});
