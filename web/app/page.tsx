import Link from "next/link";
import SectionLabel from "@/components/SectionLabel";
import Sfeerbeeld from "@/components/Sfeerbeeld";
import { fundament, clubKenmerken } from "@/content/aanbod";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-walnut/70 via-walnut/20 to-ink" />
        <div
          className="pointer-events-none absolute -top-1/4 right-0 h-[140%] w-1/2 rounded-full blur-3xl"
          style={{ background: "var(--oxblood)", opacity: 0.18 }}
        />
        <div className="pointer-events-none absolute inset-0 bg-lamellen opacity-30" />
        <div className="absolute left-10 top-0 hidden h-full lichtlijn md:block" />
        <div className="absolute left-1/3 top-0 hidden h-full lichtlijn md:block" />
        <div className="absolute right-16 top-0 hidden h-full lichtlijn md:block" />

        <div className="relative mx-auto max-w-content px-5 py-24 md:px-8 md:py-36">
          <SectionLabel>Boutique Small Group PT · Schiedam</SectionLabel>
          <h1 className="max-w-2xl text-balance font-heading text-4xl leading-tight text-paper md:text-6xl">
            Kleinschalig trainen, met volle aandacht.
          </h1>
          <p className="mt-6 max-w-xl text-balance text-lg text-greige">
            Clubs van maximaal {clubKenmerken.maxGroep} personen, sessies van{" "}
            {clubKenmerken.sessieduur}. Rustig, persoonlijk en gebouwd op
            techniek en vertrouwen — niet op herrie.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/fundament"
              className="rounded-full bg-oxblood px-7 py-3.5 text-center text-sm font-medium text-paper transition-colors hover:bg-oxblood-light"
            >
              Start het Fundament Traject — {fundament.prijsLabel}
            </Link>
            <Link
              href="/club"
              className="rounded-full border border-white/15 px-7 py-3.5 text-center text-sm text-paper transition-colors hover:border-koper-light/60"
            >
              Bekijk de Club Trainingen
            </Link>
          </div>
        </div>
      </section>

      {/* Concept */}
      <section className="mx-auto max-w-content px-5 py-20 md:px-8 md:py-28">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <SectionLabel>Het concept</SectionLabel>
            <h2 className="font-heading text-3xl text-paper md:text-4xl">
              Geen massale zaal. Geen schreeuwerige energie.
            </h2>
            <p className="mt-5 text-greige">
              De Impact Club is gebouwd rond Small Group Training: kleine
              clubs, korte sessies, veel individuele aandacht. We werken aan
              techniek en bewegingskwaliteit, zodat je met vertrouwen
              traint — alleen of samen met je club.
            </p>
            <p className="mt-4 text-greige">
              Warm, rustig en luxe van sfeer. Precies zoals de zaal zelf:
              walnoot, zwart staal en een vleugje oxblood.
            </p>
          </div>
          <Sfeerbeeld label="de zaal" variant="zaal" />
        </div>
      </section>

      {/* Klantreis */}
      <section className="border-y border-white/5 bg-ink-soft/60">
        <div className="mx-auto max-w-content px-5 py-20 md:px-8 md:py-28">
          <SectionLabel>Je route naar de Club</SectionLabel>
          <h2 className="font-heading text-3xl text-paper md:text-4xl">
            In twee stappen naar zelfverzekerd trainen
          </h2>

          <div className="mt-14 grid gap-8 md:grid-cols-2">
            <div className="lichtlijn rounded-2xl border border-white/10 bg-ink/60 p-8 pl-10">
              <span className="font-heading text-sm text-koper-light">
                Stap 1
              </span>
              <h3 className="mt-2 font-heading text-2xl text-paper">
                {fundament.naam}
              </h3>
              <p className="mt-4 text-greige">
                {fundament.duur}, {fundament.sessies}. Focus op {fundament.focus}.
              </p>
              <p className="mt-6 font-heading text-2xl text-paper">
                {fundament.prijsLabel}
              </p>
              <Link
                href="/fundament"
                className="mt-6 inline-block text-sm text-koper-light underline underline-offset-4"
              >
                Meer over het Fundament →
              </Link>
            </div>

            <div className="lichtlijn rounded-2xl border border-white/10 bg-ink/60 p-8 pl-10">
              <span className="font-heading text-sm text-koper-light">
                Stap 2
              </span>
              <h3 className="mt-2 font-heading text-2xl text-paper">
                Club Trainingen
              </h3>
              <p className="mt-4 text-greige">
                Doorstromen naar reguliere Small Group trainingen: functionele
                patronen, kleinschaligheid, community. Clubs van max.{" "}
                {clubKenmerken.maxGroep}, sessies van {clubKenmerken.sessieduur}.
              </p>
              <Link
                href="/club"
                className="mt-6 inline-block text-sm text-koper-light underline underline-offset-4"
              >
                Bekijk de Club →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Sfeerbeelden */}
      <section className="mx-auto max-w-content px-5 py-20 md:px-8 md:py-28">
        <SectionLabel>De zaal</SectionLabel>
        <h2 className="font-heading text-3xl text-paper md:text-4xl">
          Walnoot, zwart staal, warm licht
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Sfeerbeeld label="lamellenwand" variant="wand" aspect="aspect-square" />
          <Sfeerbeeld label="railsysteem" variant="detail" aspect="aspect-square" />
          <Sfeerbeeld label="entree" variant="entree" aspect="aspect-square" />
        </div>
      </section>

      {/* Slot-CTA */}
      <section className="border-t border-white/5 bg-walnut/35">
        <div className="mx-auto max-w-content px-5 py-20 text-center md:px-8 md:py-28">
          <h2 className="font-heading text-3xl text-paper md:text-4xl">
            Klaar voor je fundament?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-greige">
            Vier weken, vier privésessies, één duidelijk doel: met vertrouwen
            trainen.
          </p>
          <Link
            href="/fundament"
            className="mt-8 inline-block rounded-full bg-oxblood px-8 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-oxblood-light"
          >
            Start het Fundament Traject — {fundament.prijsLabel}
          </Link>
        </div>
      </section>
    </>
  );
}
