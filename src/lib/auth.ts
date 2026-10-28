import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getDataMode } from "@/lib/config";
import { getCommerce, getDemoIdentity } from "@/lib/data";
import type { AccountContext, BuyerAccount, SessionAccount } from "@/lib/data/types";

export const SESSION_COOKIE = "poruci_session";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 14,
};

export function buyerDestination(nextPath: string) {
  if (nextPath.startsWith("/s/") || nextPath.startsWith("/shop/")) return nextPath;
  return "/kupac";
}

export function landingPath(account: SessionAccount, nextPath: string) {
  if (account.kind === "buyer") return buyerDestination(nextPath);
  if (nextPath === "/kupac" || nextPath.startsWith("/kupac?")) return "/dashboard";
  return nextPath;
}

export async function getSession(): Promise<SessionAccount | null> {
  if (getDataMode() === "demo") {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const userId = await getDemoIdentity().getUserIdBySession(token);
    if (!userId) return null;
    return getDemoIdentity().resolveAccount(userId);
  }

  const { createSupabaseServer } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return getCommerce().resolveAccount(data.user.id);
}

export async function requireSession(): Promise<AccountContext> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.kind === "buyer") redirect("/kupac");
  return session;
}

export async function requireBuyerSession(): Promise<BuyerAccount> {
  const session = await getSession();
  if (!session) redirect("/login?next=/kupac");
  if (session.kind === "supplier") redirect("/dashboard");
  return session;
}

export async function setDemoSession(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions);
}

export async function clearDemoSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await getDemoIdentity().deleteSession(token);
  store.delete(SESSION_COOKIE);
}
