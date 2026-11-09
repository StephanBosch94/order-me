export type CustomerParty = "fizicka" | "pravna";
export type TradeDocumentKind = "nalog" | "faktura";

export function partyForPib(pib: string): CustomerParty {
  return /^\d{9}$/.test(pib.trim()) ? "pravna" : "fizicka";
}

export function paymentTermFor(party: CustomerParty, days?: number | null) {
  if (party !== "pravna") return 0;
  if (typeof days === "number" && Number.isInteger(days) && days >= 0 && days <= 365) return days;
  return 15;
}

export function partyLabel(party: CustomerParty) {
  return party === "pravna" ? "Pravno lice" : "Fizičko lice";
}

/** Only a legal entity can be marked as registered in the e-invoice system. */
export function sefRegisteredFor(party: CustomerParty, marked: boolean | null | undefined) {
  return party === "pravna" && marked === true;
}

export function documentKind(party: CustomerParty): TradeDocumentKind {
  return party === "pravna" ? "faktura" : "nalog";
}

export function documentLabel(kind: TradeDocumentKind) {
  return kind === "faktura" ? "Faktura" : "Nalog";
}

export function normalizeCustomerCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function nextCustomerCode(codes: Iterable<string>) {
  let max = 0;
  for (const code of codes) {
    const match = /^K-(\d+)$/.exec(normalizeCustomerCode(code));
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `K-${String(max + 1).padStart(4, "0")}`;
}
