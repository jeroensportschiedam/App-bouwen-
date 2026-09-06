// Scenario 8: een rittenkaart telt af zonder weekritme (geen vervaldatum per
// rit, gewoon een teller) en blokkeert zodra de kaart is volgeboekt of de
// einddatum voorbij is.
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { BoekingsFout, boek } from "@/lib/engine/booking";
import { dagenVanaf, maakActivity, maakLid, maakRittenkaart, maakSessie, maakTrainer } from "../helpers";

describe("scenario 8: rittenkaart", () => {
  it("telt af per boeking, ongeacht de weekdag, en blokkeert als de kaart vol is", async () => {
    const nu = new Date();
    const klant = await maakLid();
    const trainer = await maakTrainer();
    const activity = await maakActivity("PT");
    await maakRittenkaart({ userId: klant.id, total: 2, validUntil: dagenVanaf(365, nu) });

    // Twee sessies op willekeurige, niet-opeenvolgende dagen — geen weekritme nodig.
    const sessie1 = await maakSessie({ trainerId: trainer.id, activityId: activity.id, type: "PT", startsAt: dagenVanaf(1, nu) });
    const sessie2 = await maakSessie({ trainerId: trainer.id, activityId: activity.id, type: "PT", startsAt: dagenVanaf(9, nu) });
    const sessie3 = await maakSessie({ trainerId: trainer.id, activityId: activity.id, type: "PT", startsAt: dagenVanaf(40, nu) });

    const boeking1 = await boek(klant.id, sessie1.id, nu);
    expect(boeking1.rittenkaartId).not.toBeNull();
    let kaart = await db.rittenkaart.findFirstOrThrow({ where: { userId: klant.id } });
    expect(kaart.used).toBe(1);

    await boek(klant.id, sessie2.id, nu);
    kaart = await db.rittenkaart.findFirstOrThrow({ where: { userId: klant.id } });
    expect(kaart.used).toBe(2);

    // Kaart is nu vol (2 van de 2 ritten gebruikt) en er is geen los PT-abonnement.
    await expect(boek(klant.id, sessie3.id, nu)).rejects.toThrow(BoekingsFout);
  });

  it("blokkeert na de einddatum van de kaart", async () => {
    const nu = new Date();
    const klant = await maakLid();
    const trainer = await maakTrainer();
    const activity = await maakActivity("PT");
    await maakRittenkaart({ userId: klant.id, total: 25, validUntil: dagenVanaf(-1, nu) }); // gisteren verlopen

    const sessie = await maakSessie({ trainerId: trainer.id, activityId: activity.id, type: "PT", startsAt: dagenVanaf(3, nu) });

    await expect(boek(klant.id, sessie.id, nu)).rejects.toThrow(BoekingsFout);
  });

  it("geeft bij op tijd afmelden de rit terug, en houdt hem verbruikt bij te laat afmelden", async () => {
    const { meldAf } = await import("@/lib/engine/booking");
    const nu = new Date();
    const klant = await maakLid();
    const trainer = await maakTrainer();
    const activity = await maakActivity("PT");
    await maakRittenkaart({ userId: klant.id, total: 25, validUntil: dagenVanaf(365, nu) });

    const sessieOpTijd = await maakSessie({ trainerId: trainer.id, activityId: activity.id, type: "PT", startsAt: dagenVanaf(3, nu) });
    const boekingOpTijd = await boek(klant.id, sessieOpTijd.id, nu);
    await meldAf(boekingOpTijd.id, klant.id, undefined, nu);
    let kaart = await db.rittenkaart.findFirstOrThrow({ where: { userId: klant.id } });
    expect(kaart.used).toBe(0); // de rit blijft staan

    const sessieTeLaat = await maakSessie({ trainerId: trainer.id, activityId: activity.id, type: "PT", startsAt: dagenVanaf(0.1, nu) });
    const boekingTeLaat = await boek(klant.id, sessieTeLaat.id, nu);
    await meldAf(boekingTeLaat.id, trainer.id, false, nu); // trainer meldt af, geen credit/rit terug
    kaart = await db.rittenkaart.findFirstOrThrow({ where: { userId: klant.id } });
    expect(kaart.used).toBe(1); // de rit is verbruikt
  });
});
