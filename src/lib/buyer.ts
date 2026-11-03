import type { BuyerAccount, SupplierAccount } from "@/lib/data/types";

/** A signed-in supplier checking out uses their own name and the shop contact details. */
export function supplierCheckoutAccount(session: SupplierAccount): BuyerAccount {
  return {
    kind: "buyer",
    userId: session.userId,
    name: session.name,
    email: session.email,
    confirmationEmail: "",
    businessName: session.name,
    phone: session.organization.phone,
    address: session.organization.address,
    city: session.organization.city,
    pib: "",
    mb: "",
    postalCode: "",
    bankAccount: "",
  };
}

export function isCompanyBuyer(buyer: Pick<BuyerAccount, "name" | "businessName" | "pib">) {
  if (/^\d{9}$/.test(buyer.pib.trim())) return true;
  const company = buyer.businessName.trim();
  return company.length >= 2 && company !== buyer.name.trim();
}

export function normalizeBankAccount(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!/^\d{18}$/.test(digits)) return null;
  return `${digits.slice(0, 3)}-${digits.slice(3, 16)}-${digits.slice(16)}`;
}

export function normalizeMb(value: string) {
  const digits = value.replace(/\D/g, "");
  return /^\d{8}$/.test(digits) ? digits : null;
}

export function normalizePostalCode(value: string) {
  const digits = value.replace(/\D/g, "");
  return /^\d{5}$/.test(digits) ? digits : null;
}

/** Address that receives a potvrda. A blank confirmation email means the login or contact email. */
export function orderConfirmationEmail(account: { email: string; confirmationEmail?: string | null }) {
  const saved = account.confirmationEmail?.trim() ?? "";
  return saved || account.email.trim();
}
