import { publicStoreUrl } from "@/lib/store-host";

/** Link in the registration mail. Opening it confirms the address and signs the person in. */
export function signupConfirmUrl(appUrl: string, tokenHash: string, nextPath: string) {
  const url = new URL("/auth/potvrda", appUrl);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", "signup");
  if (nextPath.startsWith("/") && !nextPath.startsWith("//") && !nextPath.includes("://") && nextPath !== "/dashboard") {
    url.searchParams.set("next", nextPath);
  }
  return url.toString();
}

/** A new supplier opens the shop they just created. Everyone else keeps the usual path. */
export function confirmedAccountUrl(kind: "supplier" | "buyer" | "platform", slug: string, fallback: string) {
  if (kind === "supplier" && slug) return publicStoreUrl(slug);
  return fallback;
}
