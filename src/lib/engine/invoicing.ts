// Minimale incasso-run, alleen wat nodig is om de stornoregel uit CLAUDE.md
// §4/§13 vast te leggen: "een storno is een aparte status; de incasso
// probeert het bij de volgende run niet vanzelf opnieuw." De volledige
// Financiën-flow (Mollie, omzetoverzicht) komt pas in fase 7.

import type { Invoice } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Verwerkt alle openstaande incasso-facturen op of voor `op`. `betaalResultaat`
 * simuleert de bank-/Mollie-uitkomst per factuur; in fase 7 wordt dat de
 * echte SEPA-incassoclient. Facturen die al op STORNO staan horen hier niet
 * meer bij: die vraagt de query expliciet niet op, dus een volgende run pakt
 * ze niet vanzelf weer op.
 */
export async function voerIncassorunUit(
  op: Date,
  betaalResultaat: (invoice: Invoice) => boolean,
): Promise<Invoice[]> {
  const teVerwerken = await db.invoice.findMany({
    where: { method: "INCASSO", status: { in: ["OPEN", "TELAAT"] }, dueAt: { lte: op } },
  });

  const resultaten: Invoice[] = [];
  for (const invoice of teVerwerken) {
    const gelukt = betaalResultaat(invoice);
    const updated = await db.invoice.update({
      where: { id: invoice.id },
      data: gelukt ? { status: "BETAALD", paidAt: op, paidVia: "incasso" } : { status: "STORNO" },
    });
    resultaten.push(updated);
  }
  return resultaten;
}
