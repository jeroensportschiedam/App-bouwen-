// §12 van CLAUDE.md: instelbare drempelwaarden en termijnen, niet hardcoded.
// De engine leest deze uit de Setting-tabel; de waarden hieronder zijn alleen
// de fallback-defaults zolang een instelling nog niet is aangemaakt.

import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

export const SETTING_DEFAULTS = {
  "afmeldvenster.club.uren": "12",
  "afmeldvenster.pt.uren": "24",
  "afmeldvenster.rittenkaart.uren": "24",
  "geldigheid.club.dagen": "7",
  "geldigheid.pt.dagen": "14",
  "geldigheid.rittenkaart.maanden": "12",
  "creditWaarschuwing.uren": "48",
  "opvolgen.leaddagen": "2",
  "evaluatie.annuleringsdrempel.pct": "20",
  "evaluatie.aanwezigheidDrempel.pct": "90",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export async function getSetting(key: SettingKey, client: Pick<PrismaClient, "setting"> = db): Promise<string> {
  const row = await client.setting.findUnique({ where: { key } });
  if (row) return row.value;
  return SETTING_DEFAULTS[key];
}

export async function getSettingNumber(key: SettingKey, client: Pick<PrismaClient, "setting"> = db): Promise<number> {
  return Number(await getSetting(key, client));
}
