import Link from "next/link";
import type { Metadata } from "next";
import SectionLabel from "@/components/SectionLabel";
import Sfeerbeeld from "@/components/Sfeerbeeld";
import PriceCard from "@/components/PriceCard";
import { pakketten, clubKenmerken, regels } from "@/content/aanbod";

export const metadata: Metadata = {
  title: "Club Trainingen — De Impact Club",
  description:
    "Small Group Club Trainingen: clubs van maximaal 6 personen, sessies van 45 minuten. Kleinschalig, functioneel en persoonlijk.",
};

const clubPakketten = pakketten.filter((p) => p.id !== "pt-club");
const ptClub = pakketten.find((p) => p.id === "pt-club")!;

export default function ClubPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-walnut/30 via-ink to-ink" />
        <div className="relative mx-auto max-w-content px-5 py-20 md:px-8 md:py-28">
          <SectionLabel>Stap 2 van je klantreis</SectionLabel>
          <h1 className="max-w-2xl text-balance font-heading text-4xl text-paper md:text-5xl">
            Small Group Club Trainingen
          </h1>
          <p className="mt-6 max-w-xl text-greige">
            Clubs van maximaal {clubKenmerken.maxGroep} personen, sessies van{" "}
            {clubKenmerken.sessieduur}. Functionele bewegingspatronen,
            individuele aandacht en een vaste club om je heen.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-20 md:px-8 md:py-28">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <Sfeerbeeld label="club sessie" variant="zaal" />
          <div>
            <SectionLabel>Hoe een sessie eruitziet</SectionLabel>
            <h2 className="font-heading text-3xl text-paper">
              45 minuten, volle aandacht
            </h2>
            <ul className="mt-6 space-y-4 text-greige">
              <li className="lichtlijn pl-5">
                Maximaal {clubKenmerken.maxGroep} personen per club — de
                coach ziet en corrigeert iedereen.
              </li>
              <li className="lichtlijn pl-5">
                Functionele bewegingspatronen, opgebouwd vanuit de techniek
                die je in het Fundament hebt geleerd.
              </li>
              <li className="lichtlijn pl-5">
                Een vaste club: dezelfde gezichten, opbouw van community en
                onderling vertrouwen.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-ink-soft/40">
        <div className="mx-auto max-w-content px-5 py-20 md:px-8 md:py-28">
          <SectionLabel>Voor wie</SectionLabel>
          <h2 className="font-heading text-3xl text-paper md:text-4xl">
            Voor wie al het Fundament heeft gelegd
          </h2>
          <p className="mt-4 max-w-xl text-greige">
            De Club is de doorstroom na het Fundament Traject: je kent de
            basisbewegingen en bent klaar om in klein gezelschap door te
            trainen.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {clubPakketten.map((pakket) => (
              <PriceCard key={pakket.id} pakket={pakket} />
            ))}
          </div>
          <div className="mt-6 max-w-sm">
            <PriceCard pakket={ptClub} />
          </div>

          <p className="mt-8 text-sm text-greige/80">
            Afmelden: tot {regels.club.afmelden} vooraf, inhalen{" "}
            {regels.club.inhalen}. Bekijk alle regels op de{" "}
            <Link href="/tarieven" className="text-koper-light underline underline-offset-4">
              tarievenpagina
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-content px-5 py-20 text-center md:px-8 md:py-28">
        <h2 className="font-heading text-3xl text-paper md:text-4xl">
          Nog niet gestart met het Fundament?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-greige">
          Begin daar eerst — vier weken die de basis leggen voor alles wat
          volgt.
        </p>
        <Link
          href="/fundament"
          className="mt-8 inline-block rounded-full bg-oxblood px-8 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-oxblood-light"
        >
          Bekijk het Fundament Traject
        </Link>
      </section>
    </>
  );
}
