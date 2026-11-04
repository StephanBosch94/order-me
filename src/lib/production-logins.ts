/** Accounts created for a production-style login. The password stays on the server. */
export const PRODUCTION_LOGINS = [
  {
    email: "milan.kostic@savatrade.rs",
    name: "Milan Kostić",
    role: "prodavac",
    roleLabel: "Prodavac",
    shop: "Sava Trade",
  },
  {
    email: "petar@restoranmorava.rs",
    name: "Petar Marković",
    role: "kupac",
    roleLabel: "Kupac",
    shop: "Restoran Morava",
  },
] as const;

export type ProductionLogin = (typeof PRODUCTION_LOGINS)[number];

export function productionLoginPassword() {
  return process.env.PRODUCTION_LOGIN_PASSWORD?.trim() || "Sava-trgovina-2026";
}

export function productionLoginByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return PRODUCTION_LOGINS.find((account) => account.email === normalized) ?? null;
}
