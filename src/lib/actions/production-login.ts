"use server";

import { redirect } from "next/navigation";

import { landingPath, setDemoSession } from "@/lib/auth";
import { getDataMode } from "@/lib/config";
import { getDemoIdentity } from "@/lib/data";
import { productionLoginByEmail, productionLoginPassword, PRODUCTION_LOGINS } from "@/lib/production-logins";
import { signDemoSession } from "@/lib/session-token";
import { safeNextPath } from "@/lib/text";

export type ProductionLoginChoice = {
  email: string;
  name: string;
  roleLabel: string;
  shop: string;
};

export async function listProductionLoginChoices(): Promise<ProductionLoginChoice[]> {
  if (getDataMode() !== "demo") return [];
  const identity = getDemoIdentity();
  const password = productionLoginPassword();
  const available: ProductionLoginChoice[] = [];
  for (const account of PRODUCTION_LOGINS) {
    const user = await identity.verifyCredentials(account.email, password);
    if (!user) continue;
    const resolved = await identity.resolveAccount(user.id);
    if (!resolved) continue;
    if (account.role === "prodavac" && resolved.kind !== "supplier") continue;
    if (account.role === "kupac" && resolved.kind !== "buyer") continue;
    available.push({
      email: account.email,
      name: account.name,
      roleLabel: account.roleLabel,
      shop: account.shop,
    });
  }
  return available;
}

export async function signInProductionAccount(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const account = productionLoginByEmail(email);
  const nextPath = safeNextPath(String(formData.get("next") ?? ""));
  if (!account || getDataMode() !== "demo") redirect("/login");
  const identity = getDemoIdentity();
  const user = await identity.verifyCredentials(account.email, productionLoginPassword());
  if (!user) redirect("/login");
  const resolved = await identity.resolveAccount(user.id);
  if (!resolved) redirect("/login");
  const carry = await identity.sessionCarry(user.id);
  await setDemoSession(signDemoSession(user.id, Date.now(), carry));
  redirect(await landingPath(resolved, nextPath));
}
