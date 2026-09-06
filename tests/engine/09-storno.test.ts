// Scenario 9: een storno zet de factuur op STORNO en de incassorun probeert
// het bij de volgende run niet vanzelf opnieuw (CLAUDE.md §4/§13).
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { voerIncassorunUit } from "@/lib/engine/invoicing";
import { maakLid } from "../helpers";

describe("scenario 9: storno bij incasso", () => {
  it("zet de factuur op STORNO en laat hem daarna links liggen", async () => {
    const nu = new Date();
    const klant = await maakLid();
    const factuur = await db.invoice.create({
      data: {
        number: "F-0001",
        userId: klant.id,
        method: "INCASSO",
        status: "OPEN",
        issuedAt: nu,
        dueAt: nu,
      },
    });

    const eersteRun = await voerIncassorunUit(nu, () => false); // de incasso mislukt
    expect(eersteRun).toHaveLength(1);
    expect(eersteRun[0].status).toBe("STORNO");

    // Volgende run: zelfs als de bank deze keer wél zou lukken, wordt een
    // storno niet automatisch opnieuw geprobeerd — dat vraagt een handmatige
    // betaallink (CLAUDE.md §4).
    const tweedeRun = await voerIncassorunUit(nu, () => true);
    expect(tweedeRun).toHaveLength(0);

    const opgeslagen = await db.invoice.findUniqueOrThrow({ where: { id: factuur.id } });
    expect(opgeslagen.status).toBe("STORNO");
    expect(opgeslagen.paidAt).toBeNull();
  });
});
