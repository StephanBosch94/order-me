import { getAppUrl } from "@/lib/config";
import { RESERVED_SLUGS } from "@/lib/constants";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Sava Trade keeps its slug. The public address drops the hyphen. */
const SAVA_SLUG = "sava-trade";
const SAVA_HOST = "savatrade.vendro.rs";
const SAVA_LEGACY_HOST = "sava-trade.vendro.rs";
const VENDRO_APEX = new Set(["vendro.rs", "www.vendro.rs", "vendro-app.netlify.app"]);

/** Parent domain for shop addresses. Production is vendro.rs. Local dev uses *.localhost. */
export function storeDomain() {
  const configured = process.env.NEXT_PUBLIC_STORE_DOMAIN?.trim().toLowerCase().replace(/^\.+|\.+$/g, "");
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "localhost";
  return "vendro.rs";
}

export function shopSlugFromHostname(hostname: string, domain: string | null = storeDomain()) {
  const host = hostname.toLowerCase().split(":")[0] ?? "";
  if (host === SAVA_HOST) return SAVA_SLUG;
  if (!domain) return null;
  const suffix = `.${domain}`;
  if (!host.endsWith(suffix)) return null;
  const label = host.slice(0, -suffix.length);
  if (!label || label.includes(".") || !SLUG.test(label) || RESERVED_SLUGS.has(label)) return null;
  return label;
}

export function publicStoreUrl(slug: string, domain: string | null = storeDomain()) {
  if (slug === SAVA_SLUG && (!domain || domain === "vendro.rs")) return `https://${SAVA_HOST}`;
  if (!domain) return `${getAppUrl()}/shop/${slug}`;
  const local = domain === "localhost" || domain.endsWith(".localhost");
  const port = local ? process.env.PORT?.trim() || "3000" : "";
  return `${local ? "http" : "https"}://${slug}.${domain}${port ? `:${port}` : ""}`;
}

export function publicConfirmationUrl(slug: string, token: string, domain: string | null = storeDomain()) {
  if (!slug || !token) return null;
  if (!domain && slug === SAVA_SLUG) return `${publicStoreUrl(slug, null)}/potvrda/${token}`;
  if (!domain) return `${getAppUrl()}/s/${slug}/potvrda/${token}`;
  return `${publicStoreUrl(slug, domain)}/potvrda/${token}`;
}

export type StoreHostAction =
  | { type: "redirect"; hostname: string; pathname: string }
  | { type: "rewrite"; pathname: string };

/** Map a public shop host onto the existing /shop and /s routes, and send apex /shop links to the shop host. */
export function storeHostAction(hostname: string, pathname: string, domain: string | null = storeDomain()): StoreHostAction | null {
  const host = hostname.toLowerCase().split(":")[0] ?? "";
  if (host === SAVA_LEGACY_HOST) {
    return { type: "redirect", hostname: SAVA_HOST, pathname: canonicalPath(pathname, SAVA_SLUG) ?? pathname };
  }
  const slug = host === SAVA_HOST ? SAVA_SLUG : domain ? shopSlugFromHostname(hostname, domain) : null;
  if (slug) {
    const shortened = canonicalPath(pathname, slug);
    if (shortened) return { type: "redirect", hostname: host === SAVA_HOST ? SAVA_HOST : hostname, pathname: shortened };
    const internal = internalPath(pathname, slug);
    if (internal) return { type: "rewrite", pathname: internal };
    return null;
  }

  if (!domain && !VENDRO_APEX.has(host)) return null;
  const foreign = apexRedirect(pathname);
  if (!foreign) return null;
  if (!domain && foreign.slug !== SAVA_SLUG) return null;
  return {
    type: "redirect",
    hostname: shopHostname(foreign.slug, domain),
    pathname: foreign.pathname,
  };
}

function shopHostname(slug: string, domain: string | null) {
  if (slug === SAVA_SLUG && (!domain || domain === "vendro.rs")) return SAVA_HOST;
  return `${slug}.${domain}`;
}

function canonicalPath(pathname: string, slug: string) {
  if (pathname === `/shop/${slug}`) return "/";
  if (pathname.startsWith(`/shop/${slug}/`)) return pathname.slice(`/shop/${slug}`.length);
  if (pathname === `/s/${slug}`) return "/";
  const confirmation = pathname.match(new RegExp(`^/s/${slug}/potvrda/([^/]+)$`));
  if (confirmation) return `/potvrda/${confirmation[1]}`;
  return null;
}

function internalPath(pathname: string, slug: string) {
  if (pathname === "/") return `/shop/${slug}`;
  if (pathname === "/porudzbine" || pathname.startsWith("/porudzbine/")) return `/shop/${slug}${pathname}`;
  if (pathname === "/nalog" || pathname.startsWith("/nalog/")) return `/shop/${slug}${pathname}`;
  if (pathname === "/proizvod" || pathname.startsWith("/proizvod/")) return `/shop/${slug}${pathname}`;
  const confirmation = pathname.match(/^\/potvrda\/([^/]+)$/);
  if (confirmation) return `/s/${slug}/potvrda/${confirmation[1]}`;
  return null;
}

function apexRedirect(pathname: string) {
  const shop = pathname.match(/^\/shop\/([^/]+)(\/.*)?$/);
  if (shop) {
    const slug = decodeURIComponent(shop[1] ?? "");
    if (!SLUG.test(slug) || RESERVED_SLUGS.has(slug)) return null;
    return { slug, pathname: shop[2] || "/" };
  }
  const confirmation = pathname.match(/^\/s\/([^/]+)\/potvrda\/([^/]+)$/);
  if (confirmation) {
    const slug = decodeURIComponent(confirmation[1] ?? "");
    if (!SLUG.test(slug) || RESERVED_SLUGS.has(slug)) return null;
    return { slug, pathname: `/potvrda/${confirmation[2]}` };
  }
  const root = pathname.match(/^\/s\/([^/]+)$/);
  if (root) {
    const slug = decodeURIComponent(root[1] ?? "");
    if (!SLUG.test(slug) || RESERVED_SLUGS.has(slug)) return null;
    return { slug, pathname: "/" };
  }
  return null;
}
