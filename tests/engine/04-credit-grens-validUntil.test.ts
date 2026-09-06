// Scenario 4: een credit die precies op de grens van validUntil staat, telt
// niet meer mee. Verval is een afgeleide van validUntil, exclusief.
import { describe, expect, it } from "vitest";
import { geldigeCredits } from "@/lib/engine/credits";
import { geefCredit, maakLid, urenVanaf } from "../helpers";

describe("scenario 4: credit op de grens van validUntil", () => {
  it("telt niet meer mee op het exacte moment van validUntil, wel net ervoor", async () => {
    const nu = new Date();
    const klant = await maakLid();
    const validUntil = urenVanaf(24, nu);
    await geefCredit({ userId: klant.id, kind: "CLUB", validFrom: nu, validUntil });

    const opDeGrens = await geldigeCredits(klant.id, "CLUB", validUntil);
    expect(opDeGrens).toHaveLength(0);

    const netErvoor = await geldigeCredits(klant.id, "CLUB", new Date(validUntil.getTime() - 1));
    expect(netErvoor).toHaveLength(1);

    const erna = await geldigeCredits(klant.id, "CLUB", new Date(validUntil.getTime() + 1));
    expect(erna).toHaveLength(0);
  });
});
