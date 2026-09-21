interface SfeerbeeldProps {
  label: string;
  aspect?: string;
  variant?: "zaal" | "wand" | "detail" | "entree";
}

const backgrounds: Record<string, string> = {
  zaal: "from-walnut/70 via-ink-soft to-ink",
  wand: "from-walnut/80 via-walnut-light/30 to-ink",
  detail: "from-oxblood/50 via-ink-soft to-ink",
  entree: "from-greige/20 via-ink-soft to-ink",
};

// Warme "spotjes" — simuleert het zwarte railsysteem met cilinderlampen uit
// het moodboard: een paar zachte lichtpoelen op wisselende posities per variant.
const spots: Record<string, { x: string; y: string; size: string; color: string }[]> = {
  zaal: [
    { x: "22%", y: "15%", size: "38%", color: "var(--koper-light)" },
    { x: "68%", y: "30%", size: "30%", color: "var(--oxblood-light)" },
    { x: "45%", y: "78%", size: "34%", color: "var(--koper)" },
  ],
  wand: [
    { x: "30%", y: "20%", size: "30%", color: "var(--koper-light)" },
    { x: "72%", y: "60%", size: "26%", color: "var(--koper)" },
  ],
  detail: [
    { x: "50%", y: "35%", size: "45%", color: "var(--koper-light)" },
    { x: "20%", y: "80%", size: "24%", color: "var(--oxblood-light)" },
  ],
  entree: [
    { x: "35%", y: "25%", size: "36%", color: "var(--greige)" },
    { x: "75%", y: "70%", size: "28%", color: "var(--koper-light)" },
  ],
};

// Tijdelijke sfeer-illustratie in plaats van echte fotografie — de zaal wordt
// nog verbouwd. Gecomponeerd uit lichtpoelen, lamellen en korrel om meer
// diepte te geven dan een vlak kleurvlak, maar dit is en blijft geen foto.
// Triviaal te vervangen: zet een echte foto in /public/images en render die
// met next/image in plaats van dit component.
export default function Sfeerbeeld({
  label,
  aspect = "aspect-[4/3]",
  variant = "zaal",
}: SfeerbeeldProps) {
  const uid = `${variant}-${label}`.replace(/[^a-z0-9]/gi, "");

  return (
    <div
      className={`relative ${aspect} overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br ${backgrounds[variant]}`}
    >
      {/* Lichtpoelen */}
      {spots[variant].map((spot, i) => (
        <div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            left: spot.x,
            top: spot.y,
            width: spot.size,
            height: spot.size,
            transform: "translate(-50%, -50%)",
            background: spot.color,
            opacity: 0.22,
          }}
        />
      ))}

      {/* Lamellen / verticale lichtlijnen */}
      <div className="absolute inset-0 bg-lamellen opacity-50" />
      <div className="absolute left-6 top-0 h-full lichtlijn" />
      <div className="absolute left-1/2 top-0 h-full lichtlijn" />
      <div className="absolute right-10 top-0 h-full lichtlijn" />

      {/* Vignet voor diepte */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 40%, transparent 40%, var(--ink) 100%)",
          opacity: 0.75,
        }}
      />

      {/* Filmkorrel */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.12] mix-blend-overlay">
        <filter id={`grain-${uid}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain-${uid})`} />
      </svg>

      <div className="absolute inset-0 flex items-end p-4">
        <span className="rounded-full bg-ink/70 px-3 py-1 text-[11px] uppercase tracking-wider text-koper-light">
          Sfeerimpressie — geen foto · {label}
        </span>
      </div>
    </div>
  );
}
