"use client";

import { useEffect, useState } from "react";

type FontChoice = "serif" | "righteous";

const STORAGE_KEY = "dic-heading-font";

export default function HeadingFontToggle() {
  const [choice, setChoice] = useState<FontChoice>("serif");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as FontChoice | null;
    if (saved === "serif" || saved === "righteous") {
      apply(saved);
      setChoice(saved);
    }
  }, []);

  function apply(next: FontChoice) {
    document.documentElement.setAttribute(
      "data-heading-font",
      next === "righteous" ? "righteous" : ""
    );
  }

  function handleChoice(next: FontChoice) {
    setChoice(next);
    apply(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // preview-only voorkeur, geen probleem als opslag faalt
    }
  }

  return (
    <div className="fixed bottom-20 right-3 z-50 md:bottom-4">
      {open && (
        <div className="mb-2 w-56 rounded-lg border border-koper/40 bg-ink-soft p-3 text-xs text-greige shadow-xl">
          <p className="mb-2 text-paper">Kopfont — nog te kiezen</p>
          <p className="mb-3 text-greige/80">
            Open punt uit de bouwbrief: serif (moodboard-sfeer) of Righteous
            (huidig merk)?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleChoice("serif")}
              className={`flex-1 rounded-md border px-2 py-1.5 ${
                choice === "serif"
                  ? "border-koper-light bg-koper/20 text-paper"
                  : "border-white/10 text-greige"
              }`}
            >
              Serif
            </button>
            <button
              onClick={() => handleChoice("righteous")}
              className={`flex-1 rounded-md border px-2 py-1.5 ${
                choice === "righteous"
                  ? "border-koper-light bg-koper/20 text-paper"
                  : "border-white/10 text-greige"
              }`}
            >
              Righteous
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Wissel kopfont (preview-tool)"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-koper/40 bg-ink-soft text-koper-light shadow-lg"
      >
        Aa
      </button>
    </div>
  );
}
