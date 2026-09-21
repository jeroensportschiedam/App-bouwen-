export default function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs uppercase tracking-[0.2em] text-koper-light">
      {children}
    </p>
  );
}
