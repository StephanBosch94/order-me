export const TRADES = [
  { id: "mesara", label: "Mesare" },
  { id: "diskont", label: "Diskont" },
  { id: "pica", label: "Pica" },
  { id: "pekara", label: "Pekare" },
  { id: "namirnice", label: "Namirnice" },
  { id: "pice", label: "Piće" },
  { id: "nakit", label: "Nakit" },
  { id: "restoran", label: "Restorani" },
  { id: "kafic", label: "Kafići" },
  { id: "hemija", label: "Hemija" },
] as const;

export type Trade = (typeof TRADES)[number]["id"];

const DEFAULT_TRADE: Record<string, Trade> = {
  "mesara-pajic": "mesara",
  "mercis-atelier": "nakit",
  "sava-trade": "namirnice",
};

export function isTrade(value: unknown): value is Trade {
  return TRADES.some((item) => item.id === value);
}

export function tradeLabel(value: string) {
  return TRADES.find((item) => item.id === value)?.label ?? "";
}

export function tradeOrDefault(value: unknown, slug = "") {
  if (isTrade(value)) return value;
  return DEFAULT_TRADE[slug] ?? "";
}
