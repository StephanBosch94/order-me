import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getDataMode } from "@/lib/config";
import { getCommerce, getDemoIdentity } from "@/lib/data";
import type { AccountContext } from "@/lib/data/types";

export const SESSION_COOKIE = "poruci_session";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 14,
};

export async function getSession(): Promise<AccountContext | null> {
  if (getDataMode() === "demo") {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const userId = await getDemoIdentity().getUserIdBySession(token);
    if (!userId) return null;
    return getDemoIdentity().getAccount(userId);
  }

  const { createSupabaseServer } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return getCommerce().getAccount(data.user.id);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
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
