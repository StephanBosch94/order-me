import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getDataMode } from "@/lib/config";
import { storePath } from "@/lib/constants";
import { getCommerce, getDemoIdentity } from "@/lib/data";
import type { AccountContext, BuyerAccount, PlatformAccount, SessionAccount } from "@/lib/data/types";

export const SESSION_COOKIE = "poruci_session";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 14,
};

export async function buyerHomePath(userId: string) {
  const orders = await getCommerce().listBuyerOrders(userId);
  const slugs = new Set(orders.map((order) => order.supplierSlug).filter((slug) => slug.length > 0));
  if (slugs.size !== 1) return null;
  return storePath([...slugs][0]);
}

export async function buyerDestination(nextPath: string, userId?: string) {
  if (nextPath.startsWith("/s/") || nextPath.startsWith("/shop/")) return nextPath;
  if (userId) {
    const home = await buyerHomePath(userId);
    if (home) return home;
  }
  return "/kupac";
}

export async function landingPath(account: SessionAccount, nextPath: string) {
  if (account.kind === "buyer") return buyerDestination(nextPath, account.userId);
  if (account.kind === "platform") {
    return nextPath.startsWith("/platform") ? nextPath : "/platform";
  }
  if (
    nextPath.startsWith("/platform") ||
    nextPath === "/kupac" ||
    nextPath.startsWith("/kupac?") ||
    nextPath.startsWith("/shop/") ||
    nextPath.startsWith("/s/")
  ) {
    return "/dashboard";
  }
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
  if (session.kind === "buyer") redirect(await buyerDestination("", session.userId));
  if (session.kind === "platform") redirect("/platform");
  return session;
}

export async function requireBuyerSession(): Promise<BuyerAccount> {
  const session = await getSession();
  if (!session) redirect("/login?next=/kupac");
  if (session.kind === "platform") redirect("/platform");
  if (session.kind !== "buyer") redirect("/dashboard");
  const home = await buyerHomePath(session.userId);
  if (home) redirect(home);
  return session;
}

export async function requirePlatformSession(): Promise<PlatformAccount> {
  const session = await getSession();
  if (!session) redirect("/login?next=/platform");
  if (session.kind === "buyer") redirect(await buyerDestination("/kupac", session.userId));
  if (session.kind !== "platform") redirect("/dashboard");
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
