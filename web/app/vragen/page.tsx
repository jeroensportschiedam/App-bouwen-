import type { Metadata } from "next";
import SectionLabel from "@/components/SectionLabel";
import { fundament, regels, clubKenmerken } from "@/content/aanbod";

export const metadata: Metadata = {
  title: "Veelgestelde vragen — De Impact Club",
};

const vragen = [
  {
    vraag: "Wat is het Fundament Traject precies?",
    antwoord: `${fundament.duur} met ${fundament.sessies}, gericht op ${fundament.focus}. Het is de vaste eerste stap voordat je instroomt in een Club Training.`,
  },
  {
    vraag: "Moet ik per se met het Fundament beginnen?",
    antwoord:
      "Ja — het Fundament legt de techniek en bewegingskwaliteit die we in de Club Trainingen verder opbouwen.",
  },
  {
    vraag: "Hoe groot zijn de Club Trainingen?",
    antwoord: `Maximaal ${clubKenmerken.maxGroep} personen per sessie, van ${clubKenmerken.sessieduur}.`,
  },
  {
    vraag: "Hoe werkt afmelden bij een Club Training?",
    antwoord: `Afmelden kan tot ${regels.club.afmelden} vooraf, inhalen ${regels.club.inhalen}.`,
  },
  {
    vraag: "Hoe werkt afmelden bij Personal Training?",
    antwoord: `Afmelden kan tot ${regels.pt.afmelden} vooraf, inhalen ${regels.pt.inhalen}.`,
  },
];

export default function VragenPage() {
  return (
    <section className="mx-auto max-w-content px-5 py-20 md:px-8 md:py-28">
      <SectionLabel>Vragen</SectionLabel>
      <h1 className="font-heading text-4xl text-paper md:text-5xl">
        Veelgestelde vragen
      </h1>
      <p className="mt-4 max-w-xl text-greige">
        Concept-lijst op basis van de bouwbrief — vul aan of pas aan waar
        nodig.
      </p>

      <div className="mt-12 space-y-6">
        {vragen.map((item) => (
          <div
            key={item.vraag}
            className="lichtlijn rounded-2xl border border-white/10 bg-ink-soft/60 p-6 pl-8"
          >
            <h2 className="font-heading text-lg text-paper">{item.vraag}</h2>
            <p className="mt-2 text-greige">{item.antwoord}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
