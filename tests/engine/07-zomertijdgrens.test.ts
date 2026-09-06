// Scenario 7: een sessie die over de zomertijdgrens valt, houdt de juiste
// lokale starttijd. Nederland gaat terug van zomertijd naar wintertijd op de
// laatste zondag van oktober (in 2024: de nacht van 26 op 27 oktober).
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { amsterdamToUtc, formatAmsterdamTime } from "@/lib/time";
import { maakActivity, maakSessie, maakTrainer } from "../helpers";

describe("scenario 7: sessie over de zomertijdgrens", () => {
  it("houdt 06:30 lokale tijd aan, zowel vóór als na de klokwissel", async () => {
    const trainer = await maakTrainer();
    const activity = await maakActivity("CLUB");

    const voorDeWissel = amsterdamToUtc("2024-10-26", "06:30"); // zaterdag, nog zomertijd (CEST, UTC+2)
    const naDeWissel = amsterdamToUtc("2024-10-28", "06:30"); // maandag, alweer wintertijd (CET, UTC+1)

    const sessieVoor = await maakSessie({ trainerId: trainer.id, activityId: activity.id, type: "CLUB", startsAt: voorDeWissel });
    const sessieNa = await maakSessie({ trainerId: trainer.id, activityId: activity.id, type: "CLUB", startsAt: naDeWissel });

    const opgeslagenVoor = await db.session.findUniqueOrThrow({ where: { id: sessieVoor.id } });
    const opgeslagenNa = await db.session.findUniqueOrThrow({ where: { id: sessieNa.id } });

    expect(formatAmsterdamTime(opgeslagenVoor.startsAt)).toBe("06:30");
    expect(formatAmsterdamTime(opgeslagenNa.startsAt)).toBe("06:30");

    // Vóór de wissel is Amsterdam UTC+2 (04:30 UTC), erna UTC+1 (05:30 UTC).
    expect(opgeslagenVoor.startsAt.getUTCHours()).toBe(4);
    expect(opgeslagenNa.startsAt.getUTCHours()).toBe(5);
  });
});
