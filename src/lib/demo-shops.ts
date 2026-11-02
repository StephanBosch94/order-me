export const DEMO_SHOP_ROLES = {
  "mesara-pajic": { prodavac: "ana@mesarapajic.rs", kupac: "marko@restorandunav.rs" },
  "mercis-atelier": { prodavac: "vera@mercisatelier.rs", kupac: "jovana@mercisatelier.rs" },
} as const;

export type DemoRole = "prodavac" | "kupac";

export function demoShopRole(slug: string) {
  if (slug in DEMO_SHOP_ROLES) return DEMO_SHOP_ROLES[slug as keyof typeof DEMO_SHOP_ROLES];
  return null;
}

export function demoShopSlugFromPath(path: string) {
  const match = (path.split("?")[0] ?? "").match(/^\/(?:shop|s)\/([^/]+)/);
  const slug = match?.[1] ? decodeURIComponent(match[1]) : "";
  return slug && demoShopRole(slug) ? slug : null;
}

const demoAccountEmails = new Set<string>(
  Object.values(DEMO_SHOP_ROLES).flatMap((roles) => [roles.prodavac, roles.kupac]),
);

export function isDemoShopAccount(email: string) {
  return demoAccountEmails.has(email.trim().toLowerCase());
}
