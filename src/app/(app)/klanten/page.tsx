import { db } from "@/lib/db";

export default async function KlantenPage() {
  const klanten = await db.user.findMany({
    where: { role: "MEMBER" },
    orderBy: [{ lastName: "asc" }],
    take: 20,
  });
  const totaal = await db.user.count({ where: { role: "MEMBER" } });

  return (
    <div>
      <h1 className="font-display text-2xl" style={{ color: "var(--nacht)" }}>
        Klanten
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
        Tabs (Leads, Klanten, Producten, Tabel), zoeken, filteren en het volledige klantprofiel komen in fase 4. Hieronder
        alvast de eerste {klanten.length} van {totaal} klanten uit de import.
      </p>

      <ul className="mt-4 divide-y max-w-md" style={{ borderColor: "var(--line)" }}>
        {klanten.map((k) => (
          <li key={k.id} className="py-2 flex items-center justify-between text-sm">
            <span>
              {k.firstName} {k.lastName}
            </span>
            <span style={{ color: k.active ? "var(--sage)" : "var(--ink-2)" }}>{k.active ? "actief" : "inactief"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
