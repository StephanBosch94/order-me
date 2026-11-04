/** Accounts that can be used immediately, without opening a new one. */
export const PRODUCTION_LOGINS = [
  {
    email: "milan.kostic@savatrade.rs",
    name: "Milan Kostić",
    role: "prodavac",
    roleLabel: "Prodavac",
    shop: "Sava Trade",
    password: "Sava-trgovina-2026",
  },
  {
    email: "petar@restoranmorava.rs",
    name: "Petar Marković",
    role: "kupac",
    roleLabel: "Kupac",
    shop: "Restoran Morava",
    password: "Sava-trgovina-2026",
  },
] as const;

export type ProductionLogin = (typeof PRODUCTION_LOGINS)[number];

export function productionLoginByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return PRODUCTION_LOGINS.find((account) => account.email === normalized) ?? null;
}
