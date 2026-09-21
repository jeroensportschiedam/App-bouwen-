import Link from "next/link";
import { locaties, juridischeNaam } from "@/content/aanbod";

export default function Footer() {
  const locatie = locaties[0];

  return (
    <footer className="border-t border-white/5 bg-ink-soft/40">
      <div className="mx-auto max-w-content px-5 py-14 md:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <p className="font-heading text-lg text-paper">De Impact Club</p>
            <p className="mt-3 max-w-xs text-sm text-greige">
              Boutique Small Group PT. Kleinschalig, persoonlijk en gebouwd
              op techniek en vertrouwen.
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-koper-light">
              Locatie
            </p>
            <p className="mt-3 text-sm text-greige">{locatie.naam}</p>
            <p className="text-sm text-greige">{locatie.adres}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-koper-light">
              Pagina&apos;s
            </p>
            <ul className="mt-3 space-y-2 text-sm text-greige">
              <li>
                <Link href="/club" className="hover:text-paper">
                  Club Trainingen
                </Link>
              </li>
              <li>
                <Link href="/fundament" className="hover:text-paper">
                  Fundament Traject
                </Link>
              </li>
              <li>
                <Link href="/tarieven" className="hover:text-paper">
                  Tarieven
                </Link>
              </li>
              <li>
                <Link href="/vragen" className="hover:text-paper">
                  Veelgestelde vragen
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-koper-light">
              Juridisch
            </p>
            <ul className="mt-3 space-y-2 text-sm text-greige">
              <li>
                <Link href="/privacy" className="hover:text-paper">
                  Privacyverklaring
                </Link>
              </li>
              <li>
                <Link href="/voorwaarden" className="hover:text-paper">
                  Algemene voorwaarden
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/5 pt-6 text-xs text-greige/70 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} De Impact Club — handelsnaam van{" "}
            {juridischeNaam}
          </p>
          <p>Preview-omgeving, nog niet live.</p>
        </div>
      </div>
    </footer>
  );
}
