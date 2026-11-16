"use server";

import { getSession, landingPath } from "@/lib/auth";
import { confirmedAccountUrl } from "@/lib/signup-confirm";

/** Where the person goes after the confirmation link has signed them in. */
export async function openConfirmedStore() {
  const account = await getSession();
  if (!account) return "/login";
  const fallback = await landingPath(account, "/dashboard");
  const slug = account.kind === "supplier" ? account.organization.slug : "";
  return confirmedAccountUrl(account.kind, slug, fallback);
}
