"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";

const ITEMS: { href: string; label: string; ownerOnly?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/agenda", label: "Agenda" },
  { href: "/klanten", label: "Klanten" },
  { href: "/financien", label: "Financiën", ownerOnly: true },
  { href: "/rooster", label: "Menu" },
];

export function AppNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = ITEMS.filter((item) => !item.ownerOnly || role === "OWNER");

  return (
    <>
      {/* Tabbalk: onderin op mobiel, verdwijnt vanaf 1024px */}
      <nav
        className="fixed bottom-0 left-0 right-0 flex lg:hidden border-t z-20"
        style={{ background: "var(--wit)", borderColor: "var(--line)" }}
      >
        {items.map((item) => {
          const actief = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 py-3 text-center text-xs font-medium"
              style={{ color: actief ? "var(--steen)" : "var(--ink-2)" }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Zijbalk: vast vanaf 1024px, tabbalk verdwijnt */}
      <nav
        className="hidden lg:flex lg:flex-col fixed top-0 left-0 bottom-0 w-56 pt-6 border-r z-20"
        style={{ background: "var(--wit)", borderColor: "var(--line)" }}
      >
        <div className="px-6 pb-6">
          <span className="font-display text-lg" style={{ color: "var(--nacht)" }}>
            De Impact Club
          </span>
        </div>
        {items.map((item) => {
          const actief = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="px-6 py-3 text-sm font-medium"
              style={{
                color: actief ? "var(--steen)" : "var(--ink-2)",
                background: actief ? "var(--steen-50)" : "transparent",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
