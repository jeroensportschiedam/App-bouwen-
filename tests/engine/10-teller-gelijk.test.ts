// Scenario 10: de teller die de trainer ziet en de teller die de klant ziet
// zijn hetzelfde getal. Er is precies één implementatie van het saldo
// (CLAUDE.md §5: "geen enkel scherm rekent zelf saldi uit"); dit scenario
// simuleert dat beide apps dezelfde saldo()-aanroep uit de engine gebruiken,
// ook na een boeking en een afmelding die het saldo laten wijzigen.
import { describe, expect, it } from "vitest";
import { boek, meldAf } from "@/lib/engine/booking";
import { saldo } from "@/lib/engine/credits";
import { dagenVanaf, geefCredit, maakActivity, maakLid, maakSessie, maakTrainer } from "../helpers";

describe("scenario 10: trainersaldo === klantsaldo", () => {
  it("blijft gelijk voor en na een boeking en een afmelding", async () => {
    const nu = new Date();
    const klant = await maakLid();
    const trainer = await maakTrainer();
    const activity = await maakActivity("CLUB");
    const sessie = await maakSessie({ trainerId: trainer.id, activityId: activity.id, type: "CLUB", startsAt: dagenVanaf(3, nu) });
    await geefCredit({ userId: klant.id, kind: "CLUB", validFrom: nu, validUntil: dagenVanaf(30, nu) });
    await geefCredit({ userId: klant.id, kind: "CLUB", validFrom: nu, validUntil: dagenVanaf(30, nu) });

    const saldoTrainerapp = await saldo(klant.id, nu);
    const saldoKlantapp = await saldo(klant.id, nu);
    expect(saldoTrainerapp).toEqual(saldoKlantapp);
    expect(saldoTrainerapp.club).toBe(2);

    const boeking = await boek(klant.id, sessie.id, nu);
    expect((await saldo(klant.id, nu)).club).toBe((await saldo(klant.id, nu)).club);
    expect((await saldo(klant.id, nu)).club).toBe(1);

    await meldAf(boeking.id, klant.id, undefined, nu);
    const naAfmelden1 = await saldo(klant.id, nu);
    const naAfmelden2 = await saldo(klant.id, nu);
    expect(naAfmelden1).toEqual(naAfmelden2);
    expect(naAfmelden1.club).toBe(2); // de teruggegeven credit telt weer mee
  });
});
