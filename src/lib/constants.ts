import type { Audience, OrderStatus, PaymentMethod, StoreChannel, Unit } from "@/lib/data/types";

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

export const DEMO_SLUGS = new Set(["butik-vera", "gastro-supply"]);

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
  "prodora",
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

export function paymentLabel(method: PaymentMethod | null | undefined) {
  if (method === "pouzecem") return "Plaćanje pouzećem";
  if (method === "kartica") return "Karticom";
  return "";
}

export const AUDIENCES: { value: Audience; label: string; hint: string }[] = [
  { value: "fizicka", label: "Fizičkim licima", hint: "Korpa, kasa i adresa isporuke." },
  { value: "pravna", label: "Pravnim licima", hint: "Količine, podaci firme, statistika i ponovna porudžbina." },
  { value: "oba", label: "I jednim i drugima", hint: "Ista prodavnica, kupac bira kako kupuje." },
];

export function audienceLabel(audience: Audience) {
  return AUDIENCES.find((item) => item.value === audience)?.label ?? "Fizičkim licima";
}

export function sellsToConsumers(audience: Audience) {
  return audience === "fizicka" || audience === "oba";
}

export function sellsToBusinesses(audience: Audience) {
  return audience === "pravna" || audience === "oba";
}

export function channelForAudience(audience: Audience): StoreChannel {
  return audience === "pravna" ? "b2b" : "b2c";
}

export function shopMode(audience: Audience, za?: string): "fizicka" | "pravna" {
  if (!sellsToConsumers(audience)) return "pravna";
  if (!sellsToBusinesses(audience)) return "fizicka";
  return za === "firme" ? "pravna" : "fizicka";
}

export function storePath(slug: string) {
  return `/shop/${slug}`;
}

export function businessPath(slug: string) {
  return `/shop/${slug}?za=firme`;
}

export function productPath(slug: string, productId: string, business = false) {
  const path = `/shop/${slug}/proizvod/${productId}`;
  return business ? `${path}?za=firme` : path;
}

export function quantityStep(unit: Unit) {
  return unit === "kilogram" || unit === "litar" ? 0.5 : 1;
}
