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

export const DEMO_SLUGS = new Set(["mercis-atelier", "mesara-pajic"]);

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
  "platform",
  "invoices",
  "fakture",
]);

export const STORE_CLOSED_MESSAGE = "Ova prodavnica trenutno ne prima nove porudžbine.";

export const ORDER_PAGE_SIZE = 10;

export function unitLabel(unit: Unit) {
  return UNITS.find((item) => item.value === unit)?.label ?? unit;
}

export function statusLabel(status: OrderStatus) {
  return ORDER_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function paymentLabel(method: PaymentMethod | null | undefined) {
  if (method === "pouzecem") return "Plaćanje pouzećem";
  if (method === "ips") return "Plaćanje IPS-om";
  if (method === "kartica") return "Karticom";
  if (method === "racun") return "Na račun";
  return "";
}

export function isBusinessStore(audience: Audience) {
  return audience === "pravna";
}

export const AUDIENCES: { value: Audience; label: string; hint: string }[] = [
  { value: "pravna", label: "Pravna lica", hint: "Količine, podaci firme, statistika i ponovna porudžbina." },
  { value: "fizicka", label: "Fizička lica", hint: "Korpa, kasa i adresa isporuke." },
  { value: "oba", label: "Oba (pravna i fizička)", hint: "Ista prodavnica, kupac bira kako kupuje." },
];

export function audienceLabel(audience: Audience) {
  return AUDIENCES.find((item) => item.value === audience)?.label ?? "Fizička lica";
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

const LEGACY_SHOP_SLUGS: Record<string, string> = {
  "gastro-supply": "mesara-pajic",
  "butik-vera": "mercis-atelier",
};

function liveShopSlug(slug: string) {
  return LEGACY_SHOP_SLUGS[slug] ?? slug;
}

/** Potvrda lives at /s/:slug/potvrda. Legacy slugs are redirected to /shop, so links use the live slug. */
export function confirmationPath(slug: string, token: string) {
  if (!slug || !token) return null;
  return `/s/${liveShopSlug(slug)}/potvrda/${token}`;
}

export function confirmationShopMatches(urlSlug: string, supplierSlug: string) {
  return Boolean(urlSlug) && Boolean(supplierSlug) && liveShopSlug(urlSlug) === liveShopSlug(supplierSlug);
}

export function businessPath(slug: string) {
  return `/shop/${slug}?za=firme`;
}

export function productPath(slug: string, productId: string, business = false) {
  const path = `/shop/${slug}/proizvod/${productId}`;
  return business ? `${path}?za=firme` : path;
}

/** Shop steppers move by whole units. Kilogram and litar are not offered in halves. */
export function quantityStep(unit: Unit) {
  const steps: Record<Unit, number> = {
    komad: 1,
    paket: 1,
    kutija: 1,
    kilogram: 1,
    litar: 1,
  };
  return steps[unit];
}

function measuredUnit(unit: Unit) {
  return unit === "kilogram" || unit === "litar";
}

/** Smallest whole quantity offered for kilogram and litar. Counted units keep their own minimum. */
export function cartMinimum(unit: Unit, minQuantity: number) {
  if (!measuredUnit(unit)) return minQuantity;
  const min = Number.isFinite(minQuantity) && minQuantity > 0 ? minQuantity : 1;
  return Math.max(1, Math.ceil(min - 1e-9));
}

/**
 * Kilogram and litar cart lines are whole numbers.
 * A stored fraction is floored, then raised to at least 1 (or a higher product minimum).
 * 1,5 therefore shows as 1, and the next step is 2.
 */
export function normalizeCartQuantity(unit: Unit, quantity: number, minQuantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  if (!measuredUnit(unit)) return quantity;
  const snapped = Math.round(quantity * 1000) / 1000;
  const whole = Math.floor(snapped + 1e-9);
  return Math.min(9999, Math.max(cartMinimum(unit, minQuantity), whole));
}

export function addCartQuantity(unit: Unit, current: number, minQuantity: number) {
  const shown = normalizeCartQuantity(unit, current, minQuantity);
  if (shown <= 0) return measuredUnit(unit) ? cartMinimum(unit, minQuantity) : minQuantity;
  return Math.min(9999, Math.round((shown + quantityStep(unit)) * 1000) / 1000);
}

export function subtractCartQuantity(unit: Unit, current: number, minQuantity: number) {
  const shown = normalizeCartQuantity(unit, current, minQuantity);
  const min = measuredUnit(unit) ? cartMinimum(unit, minQuantity) : minQuantity;
  const next = Math.round((shown - quantityStep(unit)) * 1000) / 1000;
  return next < min ? 0 : next;
}
