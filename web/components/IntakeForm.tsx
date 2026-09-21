"use client";

import { useState } from "react";

// Preview-only: formulier verstuurt nog niets. Verwerking (bestaande backend,
// e-mail of CRM) is een open punt uit de bouwbrief — hier alleen de UI en
// basis spam-bescherming (honeypot) alvast aanwezig.
export default function IntakeForm() {
  const [verstuurd, setVerstuurd] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get("website")) return; // honeypot
    setVerstuurd(true);
  }

  if (verstuurd) {
    return (
      <div className="rounded-2xl border border-koper-light/40 bg-oxblood/10 p-6 text-paper">
        Bedankt — dit is een preview, dus er is nog niets echt verstuurd.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="hidden">
        <label htmlFor="website">Website</label>
        <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label htmlFor="naam" className="text-sm text-greige">
          Naam
        </label>
        <input
          id="naam"
          name="naam"
          required
          className="mt-1.5 w-full rounded-lg border border-white/15 bg-ink-soft px-4 py-2.5 text-paper outline-none focus:border-koper-light"
        />
      </div>

      <div>
        <label htmlFor="email" className="text-sm text-greige">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1.5 w-full rounded-lg border border-white/15 bg-ink-soft px-4 py-2.5 text-paper outline-none focus:border-koper-light"
        />
      </div>

      <div>
        <label htmlFor="telefoon" className="text-sm text-greige">
          Telefoon
        </label>
        <input
          id="telefoon"
          name="telefoon"
          type="tel"
          className="mt-1.5 w-full rounded-lg border border-white/15 bg-ink-soft px-4 py-2.5 text-paper outline-none focus:border-koper-light"
        />
      </div>

      <div>
        <label htmlFor="doel" className="text-sm text-greige">
          Waar wil je aan werken?
        </label>
        <textarea
          id="doel"
          name="doel"
          rows={3}
          className="mt-1.5 w-full rounded-lg border border-white/15 bg-ink-soft px-4 py-2.5 text-paper outline-none focus:border-koper-light"
        />
      </div>

      <label className="flex items-start gap-2 text-xs text-greige/80">
        <input type="checkbox" required className="mt-1" />
        Ik ga akkoord dat mijn gegevens gebruikt worden om contact met mij op
        te nemen over het Fundament Traject.
      </label>

      <button
        type="submit"
        className="w-full rounded-full bg-oxblood px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-oxblood-light"
      >
        Aanvraag versturen
      </button>
    </form>
  );
}
