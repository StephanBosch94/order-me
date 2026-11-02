import { setDemoSession } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import { getDemoIdentity } from "@/lib/data";
import { DEMO_PASSWORD } from "@/lib/data/seed";
import { demoShopRole, type DemoRole } from "@/lib/demo-shops";
import { signDemoSession } from "@/lib/session-token";

export async function createDemoSessionToken(slug: string, role: DemoRole) {
  if (!isDemoMode()) return null;
  const roles = demoShopRole(slug);
  if (!roles) return null;
  const user = await getDemoIdentity().verifyCredentials(roles[role], DEMO_PASSWORD);
  if (!user) return null;
  const account = await getDemoIdentity().resolveAccount(user.id);
  if (!account) return null;
  if (role === "prodavac" && account.kind !== "supplier") return null;
  if (role === "kupac" && account.kind !== "buyer") return null;
  return signDemoSession(user.id);
}

export async function establishDemoRole(slug: string, role: DemoRole) {
  const token = await createDemoSessionToken(slug, role);
  if (!token) return false;
  await setDemoSession(token);
  return true;
}
