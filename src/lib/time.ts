// Alles wordt in UTC opgeslagen in de database, en getoond in Europe/Amsterdam.
// Zie CLAUDE.md §8: let op zomer-/wintertijd bij terugkerende sessies en bij
// afmeldvensters (12u/24u).

import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export const AMSTERDAM_TZ = "Europe/Amsterdam";

/**
 * Bouwt een UTC-instant uit een lokale (Amsterdamse) datum en tijd, met
 * automatische zomer-/wintertijdcorrectie. Gebruik dit bij het aanmaken van
 * sessies uit een reeks: de wandklok-tijd (bv. "06:30") blijft dan altijd
 * 06:30 Amsterdamse tijd, ook als de sessie over de klokwissel heen valt.
 */
export function amsterdamToUtc(localDate: string, localTime: string): Date {
  return fromZonedTime(`${localDate}T${localTime}:00`, AMSTERDAM_TZ);
}

/** Toont een UTC-instant als Amsterdamse tijd, bv. "06:30". */
export function formatAmsterdamTime(utcDate: Date): string {
  return formatInTimeZone(utcDate, AMSTERDAM_TZ, "HH:mm");
}

/** Toont een UTC-instant als Amsterdamse datum en tijd. */
export function formatAmsterdam(utcDate: Date, pattern = "dd-MM-yyyy HH:mm"): string {
  return formatInTimeZone(utcDate, AMSTERDAM_TZ, pattern);
}

/** Aantal volle uren tussen twee instants. Werkt op absolute tijd, dus DST-veilig. */
export function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60);
}
