import type { Metadata } from "next";
import SectionLabel from "@/components/SectionLabel";
import { locaties } from "@/content/aanbod";
import IntakeForm from "@/components/IntakeForm";

export const metadata: Metadata = {
  title: "Contact — De Impact Club",
};

export default function ContactPage() {
  const locatie = locaties[0];

  return (
    <section className="mx-auto max-w-content px-5 py-20 md:px-8 md:py-28">
      <SectionLabel>Contact</SectionLabel>
      <h1 className="font-heading text-4xl text-paper md:text-5xl">
        Vraag je Fundament aan
      </h1>
      <p className="mt-4 max-w-xl text-greige">
        Laat je gegevens achter, dan nemen we contact op om je Fundament
        Traject in te plannen.
      </p>

      <div className="mt-14 grid gap-12 md:grid-cols-[1fr,1fr]">
        <IntakeForm />

        <div>
          <h2 className="font-heading text-xl text-paper">{locatie.naam}</h2>
          <p className="mt-2 text-greige">{locatie.adres}</p>
          <p className="mt-6 text-sm text-greige/80">
            Adres, route en openingstijden volgen nog — open punt richting
            Jeroen.
          </p>
        </div>
      </div>
    </section>
  );
}
