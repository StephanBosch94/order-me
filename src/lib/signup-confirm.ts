/** Link in the registration mail. Opening it confirms the address and signs the person in. */
export function signupConfirmUrl(
  appUrl: string,
  tokenHash: string,
  nextPath: string,
  type: "signup" | "magiclink" = "signup",
) {
  const url = new URL("/auth/potvrda", appUrl);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  if (nextPath.startsWith("/") && !nextPath.startsWith("//") && !nextPath.includes("://") && nextPath !== "/dashboard") {
    url.searchParams.set("next", nextPath);
  }
  return url.toString();
}

/** After confirmation a supplier opens the shop dashboard on the apex host. */
export function confirmedAccountUrl(kind: "supplier" | "buyer" | "platform", slug: string, fallback: string) {
  if (kind === "supplier" && slug) return "/dashboard";
  return fallback;
}
