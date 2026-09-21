import Link from "next/link";
import type { Metadata } from "next";
import SectionLabel from "@/components/SectionLabel";
import Sfeerbeeld from "@/components/Sfeerbeeld";
import { fundament } from "@/content/aanbod";

export const metadata: Metadata = {
  title: "Fundament Traject — De Impact Club",
  description:
    "4 weken, 4 privésessies. Techniek, bewegingskwaliteit en zelfvertrouwen — de start van elk traject bij De Impact Club.",
};

const weken = [
  {
    titel: "Week 1 — Kennismaking en basis",
    tekst:
      "We brengen je huidige bewegingspatroon in kaart en leggen de basis: houding, ademhaling en de bewegingen die overal in terugkomen.",
  },
  {
    titel: "Week 2 — Techniek verdiepen",
    tekst:
      "We bouwen rustig door op de basis. Elke oefening wordt eerst goed gevoeld, dan pas zwaarder of sneller.",
  },
  {
    titel: "Week 3 — Zelfvertrouwen opbouwen",
    tekst:
      "Je herkent je eigen bewegingen en weet wanneer iets goed voelt. Meer zelfstandigheid binnen de sessie.",
  },
  {
    titel: "Week 4 — Klaar voor de Club",
    tekst:
      "We ronden af en bespreken welke Club Training het beste bij je past, zodat de overstap vanzelfsprekend voelt.",
  },
];

export default function FundamentPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-oxblood/45 via-walnut/15 to-ink" />
        <div className="relative mx-auto max-w-content px-5 py-20 md:px-8 md:py-28">
          <SectionLabel>Stap 1 van je klantreis</SectionLabel>
          <h1 className="max-w-2xl text-balance font-heading text-4xl text-paper md:text-5xl">
            Het {fundament.naam}
          </h1>
          <p className="mt-6 max-w-xl text-greige">
            {fundament.duur}, {fundament.sessies}. Gericht op {fundament.focus}
            — de stevige basis voordat je instroomt in de Club.
          </p>
          <div className="mt-8 flex items-center gap-6">
            <p className="font-heading text-3xl text-paper">
              {fundament.prijsLabel}
            </p>
            <Link
              href="/contact"
              className="rounded-full bg-oxblood px-7 py-3 text-sm font-medium text-paper transition-colors hover:bg-oxblood-light"
            >
              Aanvragen
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-20 md:px-8 md:py-28">
        <div className="grid gap-12 md:grid-cols-[1fr,1fr]">
          <div className="space-y-8">
            {weken.map((week) => (
              <div key={week.titel} className="lichtlijn pl-6">
                <h3 className="font-heading text-xl text-paper">
                  {week.titel}
                </h3>
                <p className="mt-2 text-greige">{week.tekst}</p>
              </div>
            ))}
          </div>
          <Sfeerbeeld label="privésessie" variant="detail" aspect="aspect-[3/4]" />
        </div>
      </section>

      <section className="border-t border-white/5 bg-walnut/35">
        <div className="mx-auto max-w-content px-5 py-20 text-center md:px-8 md:py-24">
          <h2 className="font-heading text-3xl text-paper md:text-4xl">
            Na het Fundament: de Club
          </h2>
          <p className="mx-auto mt-4 max-w-md text-greige">
            Met een stevige basis stroom je door naar Small Group Club
            Trainingen — kleinschalig en met dezelfde aandacht.
          </p>
          <Link
            href="/club"
            className="mt-8 inline-block rounded-full border border-koper-light/60 px-8 py-3.5 text-sm text-paper transition-colors hover:bg-koper/20"
          >
            Bekijk de Club Trainingen
          </Link>
        </div>
      </section>
    </>
  );
}
