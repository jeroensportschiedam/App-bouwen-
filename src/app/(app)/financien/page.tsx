import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function FinancienPage() {
  const session = await auth();
  // De middleware blokkeert dit al voor trainers (CLAUDE.md §7); deze check
  // is een tweede, server-side slot voor het geval dat pad ooit wegvalt.
  if (session?.user.role !== "OWNER") redirect("/dashboard");

  return (
    <div>
      <h1 className="font-display text-2xl" style={{ color: "var(--nacht)" }}>
        Financiën
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
        Overzicht, Facturen en Omzet — incassorun, storno&apos;s en omzet per product komen in fase 7.
      </p>
    </div>
  );
}
