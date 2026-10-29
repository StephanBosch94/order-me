import type { BuyerAccount } from "@/lib/data/types";

export function isCompanyBuyer(buyer: Pick<BuyerAccount, "name" | "businessName" | "pib">) {
  if (/^\d{9}$/.test(buyer.pib.trim())) return true;
  const company = buyer.businessName.trim();
  return company.length >= 2 && company !== buyer.name.trim();
}
