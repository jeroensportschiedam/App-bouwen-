import Link from "next/link";

export default function StickyCTA() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-koper/30 bg-ink/95 p-3 backdrop-blur md:hidden">
      <Link
        href="/fundament"
        className="block rounded-full bg-oxblood px-5 py-3 text-center text-sm font-medium text-paper shadow-lg"
      >
        Start het Fundament Traject — €255
      </Link>
    </div>
  );
}
