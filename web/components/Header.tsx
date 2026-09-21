import Link from "next/link";

const nav = [
  { href: "/club", label: "Club" },
  { href: "/fundament", label: "Fundament" },
  { href: "/tarieven", label: "Tarieven" },
  { href: "/vragen", label: "Vragen" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-content items-center justify-between px-5 py-4 md:px-8">
        <Link
          href="/"
          className="font-heading text-lg tracking-wide text-paper"
        >
          De Impact Club
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-greige transition-colors hover:text-paper"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/fundament"
          className="hidden rounded-full border border-koper-light/60 px-5 py-2 text-sm text-paper transition-colors hover:bg-koper/20 md:inline-block"
        >
          Start het Fundament
        </Link>

        {/* Mobiel: compacte CTA, volledige nav zit in de sticky balk onderaan */}
        <Link
          href="/fundament"
          className="rounded-full border border-koper-light/60 px-4 py-1.5 text-sm text-paper md:hidden"
        >
          Fundament
        </Link>
      </div>
    </header>
  );
}
