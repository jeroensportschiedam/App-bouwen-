import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const session = await auth();
  const [actieveKlanten, wachtendeLeads] = await Promise.all([
    db.user.count({ where: { role: "MEMBER", active: true } }),
    db.lead.count({ where: { status: { in: ["NIEUW", "GEBELD"] } } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl" style={{ color: "var(--nacht)" }}>
        Welkom, {session?.user.name}
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        Ingelogd als {session?.user.role === "OWNER" ? "eigenaar" : "trainer"}.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 max-w-md">
        <div className="rounded-lg border p-4" style={{ borderColor: "var(--line)", background: "var(--wit)" }}>
          <div className="font-display text-3xl tabular-nums" style={{ color: "var(--steen)" }}>
            {actieveKlanten}
          </div>
          <div className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>
            Actieve klanten
          </div>
        </div>
        <div className="rounded-lg border p-4" style={{ borderColor: "var(--line)", background: "var(--wit)" }}>
          <div className="font-display text-3xl tabular-nums" style={{ color: "var(--amber)" }}>
            {wachtendeLeads}
          </div>
          <div className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>
            Leads te wachten
          </div>
        </div>
      </div>

      <p className="mt-8 text-sm" style={{ color: "var(--ink-2)" }}>
        Het volledige dashboard met aandachtspunten en signaalbalken komt in fase 3.
      </p>
    </div>
  );
}
