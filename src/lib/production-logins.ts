/** Local demo accounts. Passwords live only in seed fixtures, never in the UI. */
export const PRODUCTION_LOGINS = [
  {
    email: "milan.kostic@savatrade.rs",
    name: "Milan Kostić",
    role: "prodavac",
    roleLabel: "Prodavac",
    shop: "Sava Trade",
  },
  {
    email: "jelena.stankovic@example.com",
    name: "Jelena Stanković",
    role: "kupac",
    roleLabel: "Kupac",
    shop: "Sava Trade",
  },
] as const;

/** Demo-only passwords. Used by local seed, never by production login UI. */
export const DEMO_SEED_PASSWORDS: Record<string, string> = {
  "milan.kostic@savatrade.rs": "Sava-trgovina-2026",
  "jelena.stankovic@example.com": "Sava-trgovina-2026",
};

export type ProductionLogin = (typeof PRODUCTION_LOGINS)[number];

export function productionLoginByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return PRODUCTION_LOGINS.find((account) => account.email === normalized) ?? null;
}

export function demoSeedPassword(email: string) {
  return DEMO_SEED_PASSWORDS[email.trim().toLowerCase()] ?? "";
}
