export const DEMO_SHOP_ROLES = {
  "mesara-pajic": { prodavac: "ana@mesarapajic.rs", kupac: "marko@restorandunav.rs" },
  "mercis-atelier": { prodavac: "vera@mercisatelier.rs", kupac: "jovana@mercisatelier.rs" },
} as const;

/** Inbox that receives mail for the demo accounts, so the email service can be tried. */
export const DEMO_INBOX = "stephanbosch94@gmail.com";

export type DemoRole = "prodavac" | "kupac";

export function demoShopRole(slug: string) {
  if (slug in DEMO_SHOP_ROLES) return DEMO_SHOP_ROLES[slug as keyof typeof DEMO_SHOP_ROLES];
  return null;
}

/** Demo shops deliver to the test inbox instead of the sample customer addresses. */
export function mailRecipient(slug: string, to: string) {
  if (demoShopRole(slug)) return DEMO_INBOX;
  return accountMailRecipient(to);
}

export function accountMailRecipient(email: string) {
  const normalized = email.trim().toLowerCase();
  if (isDemoShopAccount(normalized) || testInboxEmails.has(normalized)) return DEMO_INBOX;
  return email.trim();
}

export function demoShopSlugFromPath(path: string) {
  const match = (path.split("?")[0] ?? "").match(/^\/(?:shop|s)\/([^/]+)/);
  const slug = match?.[1] ? decodeURIComponent(match[1]) : "";
  return slug && demoShopRole(slug) ? slug : null;
}

const demoAccountEmails = new Set<string>(
  Object.values(DEMO_SHOP_ROLES).flatMap((roles) => [roles.prodavac, roles.kupac]),
);

const testInboxEmails = new Set<string>([
  "milan.kostic@savatrade.rs",
  "petar@restoranmorava.rs",
  "porudzbine@savatrade.rs",
]);

export function isDemoShopAccount(email: string) {
  return demoAccountEmails.has(email.trim().toLowerCase());
}
