export const AUTH_SCOPE_COOKIE = "vendro_auth_scope";
export const AUTH_SCOPE_VALUE = "host";
export const SUPABASE_AUTH_COOKIE = "vendro_auth";

export function sharedAuthCookieOptions() {
  const configured = process.env.NEXT_PUBLIC_STORE_DOMAIN?.trim().replace(/^\./, "").toLowerCase();
  let root = configured || "";
  if (!root) {
    try {
      const hostname = new URL(process.env.NEXT_PUBLIC_APP_URL || "").hostname.toLowerCase();
      root = hostname === "vendro.rs" || hostname === "www.vendro.rs" ? "vendro.rs" : "";
    } catch {
      root = "";
    }
  }
  const domain = root && root !== "localhost" && !root.endsWith(".localhost") ? `.${root}` : undefined;
  return {
    name: SUPABASE_AUTH_COOKIE,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    ...(domain ? { domain } : {}),
  };
}

/** A parent-domain auth cookie and a host-only one share a name. Next keeps one, and the session read fails. */
export function vendroHost(hostname: string) {
  const host = hostname.toLowerCase().split(",")[0]?.trim().split(":")[0] ?? "";
  return host === "vendro.rs" || host.endsWith(".vendro.rs");
}

export function supabaseAuthCookieName(name: string) {
  return name === SUPABASE_AUTH_COOKIE ||
    name.startsWith(`${SUPABASE_AUTH_COOKIE}.`) ||
    /^sb-[a-z0-9]+-auth-token(?:\.\d+)?$/.test(name);
}

export function parentAuthClearHeaders(cookieHeader: string) {
  const names = new Set<string>();
  for (const part of cookieHeader.split(";")) {
    const name = part.split("=")[0]?.trim() ?? "";
    if (supabaseAuthCookieName(name)) names.add(name);
  }
  const domain = sharedAuthCookieOptions().domain ?? ".vendro.rs";
  const securePart = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return [...names].map(
    (name) => `${name}=; Domain=${domain}; Path=/; Max-Age=0; HttpOnly;${securePart} SameSite=Lax`,
  );
}

export function authScopeCookie(secure: boolean) {
  return `${AUTH_SCOPE_COOKIE}=${AUTH_SCOPE_VALUE}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}
