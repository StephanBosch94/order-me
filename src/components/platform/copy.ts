import type { Audience, InvoiceStatus, SubscriptionStatus } from "@/lib/data/types";

export function supplierAudienceLabel(audience: Audience) {
  if (audience === "pravna") return "Pravna lica";
  if (audience === "fizicka") return "Fizička lica";
  return "Oba";
}

export function subscriptionStatusLabel(status: SubscriptionStatus) {
  if (status === "aktivna") return "Aktivna";
  if (status === "otkazana") return "Otkazana";
  return "Istekla";
}

export function invoiceStatusLabel(status: InvoiceStatus) {
  return status === "placena" ? "Plaćena" : "Neplaćena";
}

export const SUBSCRIPTION_STATUS_OPTIONS: { value: SubscriptionStatus; label: string }[] = [
  { value: "aktivna", label: "Aktivna" },
  { value: "otkazana", label: "Otkazana" },
  { value: "istekla", label: "Istekla" },
];
