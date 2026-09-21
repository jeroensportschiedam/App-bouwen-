interface SfeerbeeldProps {
  label: string;
  aspect?: string;
  variant?: "zaal" | "wand" | "detail";
}

const variants: Record<string, string> = {
  zaal: "from-ink via-walnut/40 to-ink",
  wand: "from-walnut via-ink-soft to-ink",
  detail: "from-oxblood/30 via-ink-soft to-ink",
};

// Tijdelijke sfeerplaceholder in plaats van echte fotografie — de zaal wordt
// verbouwd (gepland april 2027). Duidelijk gemarkeerd, triviaal te vervangen
// door een echte foto in /public/images zodra die beschikbaar is.
export default function Sfeerbeeld({
  label,
  aspect = "aspect-[4/3]",
  variant = "zaal",
}: SfeerbeeldProps) {
  return (
    <div
      className={`relative ${aspect} overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br ${variants[variant]}`}
    >
      <div className="absolute inset-0 bg-lamellen opacity-40" />
      <div className="absolute left-6 top-0 h-full lichtlijn" />
      <div className="absolute left-1/2 top-0 h-full lichtlijn" />
      <div className="absolute right-10 top-0 h-full lichtlijn" />
      <div className="absolute inset-0 flex items-end p-4">
        <span className="rounded-full bg-ink/70 px-3 py-1 text-[11px] uppercase tracking-wider text-koper-light">
          Sfeerbeeld — placeholder · {label}
        </span>
      </div>
    </div>
  );
}
