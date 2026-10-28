import type { OrderStatus, StoreChannel, Unit } from "@/lib/data/types";

export const UNITS: { value: Unit; label: string }[] = [
  { value: "komad", label: "Komad" },
  { value: "paket", label: "Paket" },
  { value: "kutija", label: "Kutija" },
  { value: "kilogram", label: "Kilogram" },
  { value: "litar", label: "Litar" },
];

export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "nova", label: "Nova" },
  { value: "potvrdjena", label: "Potvrđena" },
  { value: "u_pripremi", label: "U pripremi" },
  { value: "isporucena", label: "Isporučena" },
  { value: "otkazana", label: "Otkazana" },
];

export const UNIT_ALIASES: Record<string, Unit> = {
  komad: "komad",
  kom: "komad",
  komada: "komad",
  paket: "paket",
  kutija: "kutija",
  kilogram: "kilogram",
  kg: "kilogram",
  litar: "litar",
  lit: "litar",
  l: "litar",
};

export const DEMO_SLUGS = new Set(["kafa-kutak", "gastro-supply"]);

export const RESERVED_SLUGS = new Set([
  "login",
  "signup",
  "registracija",
  "dashboard",
  "orders",
  "products",
  "customers",
  "settings",
  "api",
  "s",
  "shop",
  "admin",
  "poruci",
  "app",
  "prijava",
  "kupac",
]);

export const ORDER_PAGE_SIZE = 10;

export function unitLabel(unit: Unit) {
  return UNITS.find((item) => item.value === unit)?.label ?? unit;
}

export function statusLabel(status: OrderStatus) {
  return ORDER_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function storePath(channel: StoreChannel, slug: string) {
  return `${channel === "b2c" ? "/shop" : "/s"}/${slug}`;
}

export function quantityStep(unit: Unit) {
  return unit === "kilogram" || unit === "litar" ? 0.5 : 1;
}
