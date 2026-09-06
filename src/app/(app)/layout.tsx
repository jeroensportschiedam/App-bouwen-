import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { AppNav } from "@/components/nav/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--zand)" }}>
      <header
        className="fixed top-0 left-0 right-0 z-30 lg:left-56"
        style={{ background: "var(--nacht)", borderBottom: "3px solid var(--klei)" }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-display text-base lg:hidden" style={{ color: "var(--wit)" }}>
            De Impact Club
          </span>
          <span className="hidden lg:block text-sm" style={{ color: "var(--steen-400)" }}>
            {session.user.role === "OWNER" ? "Eigenaar" : "Trainer"}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: "var(--wit)" }}>
              {session.user.name}
            </span>
            <form action={logout}>
              <button type="submit" className="text-xs underline" style={{ color: "var(--steen-400)" }}>
                Uitloggen
              </button>
            </form>
          </div>
        </div>
      </header>

      <AppNav role={session.user.role} />

      <main className="pt-16 pb-16 lg:pb-6 lg:pl-56">
        <div className="px-4 py-4 lg:px-8 lg:py-8 max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
