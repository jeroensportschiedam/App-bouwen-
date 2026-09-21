import type { Metadata } from "next";
import SectionLabel from "@/components/SectionLabel";
import { juridischeNaam } from "@/content/aanbod";

export const metadata: Metadata = {
  title: "Privacyverklaring — De Impact Club",
};

export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-content px-5 py-20 md:px-8 md:py-28">
      <SectionLabel>Juridisch</SectionLabel>
      <h1 className="font-heading text-4xl text-paper md:text-5xl">
        Privacyverklaring
      </h1>
      <p className="mt-6 max-w-2xl text-greige">
        Placeholder — deze pagina volgt nog. Formele documenten lopen
        voorlopig onder de bedrijfsnaam {juridischeNaam}, tot de bedrijfsnaam
        formeel is omgezet naar De Impact Club.
      </p>
    </section>
  );
}
