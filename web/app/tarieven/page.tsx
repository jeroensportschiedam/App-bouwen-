import Link from "next/link";
import type { Metadata } from "next";
import SectionLabel from "@/components/SectionLabel";
import PriceCard from "@/components/PriceCard";
import { fundament, pakketten, regels } from "@/content/aanbod";

export const metadata: Metadata = {
  title: "Tarieven — De Impact Club",
  description:
    "Alle pakketten en prijzen van De Impact Club: Fundament Traject, Club Trainingen en PT + Club, met afmeld- en inhaalregels.",
};

export default function TarievenPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-walnut/30 via-ink to-ink" />
        <div className="relative mx-auto max-w-content px-5 py-20 md:px-8 md:py-24">
          <SectionLabel>Overzicht</SectionLabel>
          <h1 className="max-w-2xl text-balance font-heading text-4xl text-paper md:text-5xl">
            Tarieven
          </h1>
          <p className="mt-6 max-w-xl text-greige">
            Eén helder startpunt, drie manieren om door te stromen.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-16 md:px-8">
        <div className="rounded-2xl border border-koper-light/40 bg-oxblood/10 p-8">
          <span className="text-xs uppercase tracking-wider text-koper-light">
            Start hier
          </span>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="font-heading text-2xl text-paper">
              {fundament.naam}
            </h2>
            <p className="font-heading text-3xl text-paper">
              {fundament.prijsLabel}
            </p>
          </div>
          <p className="mt-2 text-greige">
            {fundament.duur}, {fundament.sessies} — {fundament.focus}.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-8 md:px-8">
        <SectionLabel>Doorstroom na het Fundament</SectionLabel>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {pakketten.map((pakket) => (
            <PriceCard key={pakket.id} pakket={pakket} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-20 md:px-8 md:py-24">
        <SectionLabel>Afmelden en inhalen</SectionLabel>
        <h2 className="font-heading text-3xl text-paper md:text-4xl">
          Regels op een rij
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="lichtlijn rounded-2xl border border-white/10 bg-ink-soft/60 p-7 pl-9">
            <h3 className="font-heading text-xl text-paper">Club</h3>
            <ul className="mt-4 space-y-2 text-greige">
              <li>Afmelden: tot {regels.club.afmelden} vooraf</li>
              <li>Inhalen: {regels.club.inhalen}</li>
            </ul>
          </div>
          <div className="lichtlijn rounded-2xl border border-white/10 bg-ink-soft/60 p-7 pl-9">
            <h3 className="font-heading text-xl text-paper">
              Personal Training
            </h3>
            <ul className="mt-4 space-y-2 text-greige">
              <li>Afmelden: tot {regels.pt.afmelden} vooraf</li>
              <li>Inhalen: {regels.pt.inhalen}</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-walnut/20">
        <div className="mx-auto max-w-content px-5 py-20 text-center md:px-8 md:py-24">
          <h2 className="font-heading text-3xl text-paper md:text-4xl">
            Vragen over welk pakket bij je past?
          </h2>
          <Link
            href="/contact"
            className="mt-8 inline-block rounded-full bg-oxblood px-8 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-oxblood-light"
          >
            Neem contact op
          </Link>
        </div>
      </section>
    </>
  );
}
