"use server";

import { redirect } from "next/navigation";

import { landingPath } from "@/lib/auth";
import { getDataMode } from "@/lib/config";
import { getCommerce } from "@/lib/data";
import { confirmedAccountUrl } from "@/lib/signup-confirm";
import { safeNextPath } from "@/lib/text";

export async function confirmSignup(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "").trim();
  const next = safeNextPath(String(formData.get("next") ?? ""));
  if (!tokenHash || getDataMode() !== "supabase") redirect("/login");

  const { createSupabaseServer } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.verifyOtp({ type: "signup", token_hash: tokenHash });
  if (error) redirect("/login");

  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const account = await getCommerce().resolveAccount(data.user.id);
  if (!account) redirect("/login");
  const fallback = await landingPath(account, next);
  redirect(confirmedAccountUrl(account.kind, account.kind === "supplier" ? account.organization.slug : "", fallback));
}
