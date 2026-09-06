// Eén plek voor euro-formattering. Bedragen worden overal als centen (Int) opgeslagen.

const FORMATTER = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
});

export function euro(cents: number): string {
  return FORMATTER.format(cents / 100);
}

export function centsFromEuro(euroAmount: number): number {
  return Math.round(euroAmount * 100);
}
