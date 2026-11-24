import { storeDomain } from "@/lib/store-host";

/** Sava Trade keeps its slug. The public address drops the hyphen. */
const SAVA_SLUG = "sava-trade";
const SAVA_HOST = "savatrade.vendro.rs";

/**
 * Public hostname for a shop on the store domain.
 * Local *.localhost hosts need no Netlify alias.
 */
export function shopPublicHostname(slug: string, domain: string | null = storeDomain()) {
  const value = slug.trim().toLowerCase();
  if (!value) return null;
  if (value === SAVA_SLUG && (!domain || domain === "vendro.rs")) return SAVA_HOST;
  if (!domain) return null;
  if (domain === "localhost" || domain.endsWith(".localhost")) return null;
  return `${value}.${domain}`;
}

export type ShopHostResult =
  | { ok: true; hostname: string | null; skipped: true; reason: string }
  | { ok: true; hostname: string; skipped: false; created: boolean }
  | { ok: false; hostname: string | null; reason: string };

function siteId() {
  return process.env.NETLIFY_SITE_ID?.trim() || process.env.SITE_ID?.trim() || "";
}

function authToken() {
  return process.env.NETLIFY_AUTH_TOKEN?.trim() || "";
}

/**
 * Ensure the shop host is a Netlify domain alias so HTTPS certificates can issue.
 * Wildcard DNS is not enough — Netlify still needs a concrete alias per host.
 * Soft-fails when credentials are missing or the API rejects the change.
 */
export async function ensureShopDomainAlias(
  slug: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ShopHostResult> {
  const hostname = shopPublicHostname(slug);
  if (!hostname) {
    return { ok: true, hostname: null, skipped: true, reason: "no-public-host" };
  }

  const token = authToken();
  const id = siteId();
  if (!token || !id) {
    return { ok: false, hostname, reason: "missing-netlify-credentials" };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  try {
    const current = await fetchImpl(`https://api.netlify.com/api/v1/sites/${id}`, { headers });
    if (!current.ok) {
      return { ok: false, hostname, reason: `get-site-${current.status}` };
    }
    const site = (await current.json()) as { domain_aliases?: string[] };
    const aliases = Array.isArray(site.domain_aliases) ? [...site.domain_aliases] : [];
    if (aliases.includes(hostname)) {
      return { ok: true, hostname, skipped: false, created: false };
    }

    aliases.push(hostname);
    const updated = await fetchImpl(`https://api.netlify.com/api/v1/sites/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ domain_aliases: aliases }),
    });
    if (!updated.ok) {
      return { ok: false, hostname, reason: `put-alias-${updated.status}` };
    }
    return { ok: true, hostname, skipped: false, created: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "netlify-request-failed";
    return { ok: false, hostname, reason };
  }
}
