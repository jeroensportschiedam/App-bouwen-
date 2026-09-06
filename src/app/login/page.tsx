import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/dashboard";

  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: (formData.get("callbackUrl") as string) || "/dashboard",
      });
    } catch (error) {
      if (error instanceof AuthError) {
        const url = new URL("/login", "http://localhost");
        url.searchParams.set("error", "1");
        if (formData.get("callbackUrl")) url.searchParams.set("callbackUrl", String(formData.get("callbackUrl")));
        redirect(url.pathname + url.search);
      }
      throw error;
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--zand)] px-4">
      <div className="w-full max-w-sm">
        <div className="h-1 w-full rounded-t-lg" style={{ background: "var(--klei)" }} />
        <div className="bg-[var(--nacht)] rounded-b-none px-8 pt-8 pb-6 rounded-t-none">
          <h1 className="font-display text-2xl" style={{ color: "var(--wit)" }}>
            De Impact Club
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--steen-400)" }}>
            Inloggen voor trainers en de eigenaar
          </p>
        </div>

        <form action={login} className="bg-[var(--wit)] rounded-b-lg px-8 py-6 shadow-sm border border-[var(--line)] border-t-0 space-y-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />

          {params.error && (
            <p className="text-sm rounded-md px-3 py-2" style={{ background: "#F7E9E9", color: "var(--wijn)" }}>
              E-mailadres of wachtwoord klopt niet. Probeer het opnieuw.
            </p>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: "var(--ink-2)" }}>
              E-mailadres
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: "var(--ink-2)" }}>
              Wachtwoord
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md py-2.5 text-sm font-medium text-white transition"
            style={{ background: "var(--steen)" }}
          >
            Inloggen
          </button>
        </form>
      </div>
    </main>
  );
}
