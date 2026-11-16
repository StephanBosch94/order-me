export const AUTH_SCOPE_COOKIE = "vendro_auth_scope";
export const AUTH_SCOPE_VALUE = "host";

/** A parent-domain auth cookie and a host-only one share a name. Next keeps one, and the session read fails. */
export function vendroHost(hostname: string) {
  const host = hostname.toLowerCase().split(",")[0]?.trim().split(":")[0] ?? "";
  return host === "vendro.rs" || host.endsWith(".vendro.rs");
}

export function supabaseAuthCookieName(name: string) {
  return /^sb-[a-z0-9]+-auth-token(?:\.\d+)?$/.test(name);
}

export function parentAuthClearHeaders(cookieHeader: string) {
  const names = new Set<string>();
  for (const part of cookieHeader.split(";")) {
    const name = part.split("=")[0]?.trim() ?? "";
    if (supabaseAuthCookieName(name)) names.add(name);
  }
  return [...names].map(
    (name) => `${name}=; Domain=.vendro.rs; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
  );
}

export function authScopeCookie(secure: boolean) {
  return `${AUTH_SCOPE_COOKIE}=${AUTH_SCOPE_VALUE}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}
