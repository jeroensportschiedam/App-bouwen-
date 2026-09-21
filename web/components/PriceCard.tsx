import type { Pakket } from "@/content/aanbod";

export default function PriceCard({ pakket }: { pakket: Pakket }) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-7 ${
        pakket.uitgelicht
          ? "border-koper-light bg-walnut/40"
          : "border-white/10 bg-ink-soft/60"
      }`}
    >
      {pakket.uitgelicht && (
        <span className="absolute -top-3 left-7 rounded-full bg-oxblood px-3 py-1 text-[11px] uppercase tracking-wider text-paper">
          Meest gekozen
        </span>
      )}
      <h3 className="font-heading text-xl text-paper">{pakket.naam}</h3>
      <p className="mt-2 text-sm text-greige">{pakket.omschrijving}</p>
      <p className="mt-6 font-heading text-3xl text-paper">
        {pakket.prijsLabel}
      </p>
      <a
        href="/fundament"
        className="mt-6 rounded-full border border-koper-light/60 px-5 py-2.5 text-center text-sm text-paper transition-colors hover:bg-koper/20"
      >
        Start met het Fundament
      </a>
    </div>
  );
}
