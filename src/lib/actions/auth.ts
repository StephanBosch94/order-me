"use server";

import { redirect } from "next/navigation";

import { buyerDestination, clearDemoSession, landingPath, setDemoSession } from "@/lib/auth";
import { RESERVED_SLUGS } from "@/lib/constants";
import { getAppUrl, getDataMode } from "@/lib/config";
import { getCommerce, getDemoIdentity } from "@/lib/data";
import { deliverSignupConfirmationEmail } from "@/lib/email/signup";
import { DataError } from "@/lib/errors";
import { signupConfirmUrl } from "@/lib/signup-confirm";
import { safeNextPath, slugCandidate } from "@/lib/text";
import { normalizeMb, normalizePostalCode } from "@/lib/buyer";
import { signDemoSession } from "@/lib/session-token";
import { fieldErrors, loginSchema, signupSchema } from "@/lib/validators";
import { consumeActionLimit, requestFingerprint } from "@/lib/rate-limit";

export type AuthState = {
  error: string;
  fieldErrors?: Record<string, string>;
};

export type ConfirmationState = {
  error?: string;
  message?: string;
  sentAt?: number;
};

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) {
    return { error: "Proverite email i lozinku.", fieldErrors: fieldErrors(parsed.error) };
  }

  const fingerprint = await requestFingerprint();
  if (!(await consumeActionLimit("login", `${fingerprint}:${parsed.data.email}`, 10, 10 * 60))) {
    return { error: "Previše pokušaja. Sačekajte nekoliko minuta." };
  }

  const nextPath = safeNextPath(parsed.data.next);

  if (getDataMode() === "demo") {
    const user = await getDemoIdentity().verifyCredentials(parsed.data.email, parsed.data.password);
    if (!user) return { error: "Prijava nije uspela. Proverite email i lozinku." };
    const account = await getDemoIdentity().resolveAccount(user.id);
    if (!account) return { error: "Nalog nije završen. Završite registraciju." };
    const carry = await getDemoIdentity().sessionCarry(user.id);
    await setDemoSession(signDemoSession(user.id, Date.now(), carry));
    redirect(await landingPath(account, nextPath));
  }

  const { createSupabaseServer } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: "Prijava nije uspela. Proverite email i lozinku." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Prijava nije uspela." };
  const account = await getCommerce().resolveAccount(data.user.id);
  if (!account) return { error: "Nalog nije završen. Završite registraciju." };
  redirect(await landingPath(account, nextPath));
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const kind = formData.get("kind") === "buyer" ? "buyer" : "supplier";
  const person = formData.get("profile") === "osoba";
  const rawNext = formData.get("next");
  const requestedNext = safeNextPath(typeof rawNext === "string" ? rawNext : undefined);
  const parsed = signupSchema.safeParse(
    kind === "buyer"
      ? {
          kind,
          profile: person ? "osoba" : "firma",
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
          confirmPassword: formData.get("confirmPassword"),
          businessName: person ? formData.get("name") : formData.get("businessName"),
          phone: formData.get("phone") ?? "",
          address: formData.get("address") ?? "",
          city: formData.get("city") ?? "",
          pib: person ? "" : (formData.get("pib") ?? ""),
          mb: person ? "" : (formData.get("mb") ?? ""),
          postalCode: formData.get("postalCode") ?? "",
          confirmationEmail: formData.get("confirmationEmail") ?? "",
        }
      : {
          kind,
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
          confirmPassword: formData.get("confirmPassword"),
          audience: formData.get("audience"),
          organizationName: formData.get("organizationName"),
          phone: formData.get("phone") ?? "",
        },
  );
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Proverite unete podatke.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const fingerprint = await requestFingerprint();
  const signupAllowed =
    (await consumeActionLimit("signup-ip", fingerprint, 5, 60 * 60)) &&
    (await consumeActionLimit("signup-email", parsed.data.email, 3, 60 * 60));
  if (!signupAllowed) return { error: "Previše pokušaja. Sačekajte i pokušajte ponovo." };

  try {
    const slug = parsed.data.kind === "supplier" ? await freeSlug(parsed.data.organizationName) : "";
    if (getDataMode() === "demo") {
      if (await getDemoIdentity().emailExists(parsed.data.email)) {
        return { error: "Nalog sa ovom email adresom već postoji.", fieldErrors: { email: "Email je zauzet." } };
      }
      const user = await getDemoIdentity().createUser({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        kind: parsed.data.kind,
        businessName: parsed.data.kind === "buyer" ? parsed.data.businessName : "",
        phone: parsed.data.phone,
        address: parsed.data.kind === "buyer" ? parsed.data.address : "",
        city: parsed.data.kind === "buyer" ? parsed.data.city : "",
        pib: parsed.data.kind === "buyer" ? parsed.data.pib : "",
        mb: parsed.data.kind === "buyer" ? normalizeMb(parsed.data.mb) ?? "" : "",
        postalCode: parsed.data.kind === "buyer" ? normalizePostalCode(parsed.data.postalCode) ?? "" : "",
        bankAccount: "",
        confirmationEmail: parsed.data.kind === "buyer" ? parsed.data.confirmationEmail : "",
      });
      if (parsed.data.kind === "supplier") {
        await getCommerce().createOrganization({
          userId: user.id,
          userName: parsed.data.name,
          userEmail: user.email,
          name: parsed.data.organizationName,
          slug,
          phone: parsed.data.phone,
          audience: parsed.data.audience,
        });
      }
      const carry = await getDemoIdentity().sessionCarry(user.id);
      await setDemoSession(signDemoSession(user.id, Date.now(), carry));
      redirect(parsed.data.kind === "buyer" ? await buyerDestination(requestedNext, user.id) : "/dashboard");
    }

    const { getServiceClient } = await import("@/lib/supabase/admin");
    const admin = getServiceClient();
    const created = await admin.auth.admin.generateLink({
      type: "signup",
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { name: parsed.data.name },
        redirectTo: getAppUrl(),
      },
    });
    if (created.error || !created.data.user) {
      if (emailAlreadyUsed(created.error)) {
        return { error: "Nalog sa ovom email adresom već postoji.", fieldErrors: { email: "Email je zauzet." } };
      }
      return { error: "Registracija nije uspela." };
    }
    const userId = created.data.user.id;
    const tokenHash = created.data.properties?.hashed_token ?? "";
    if (!tokenHash) {
      await admin.auth.admin.deleteUser(userId);
      return { error: "Registracija nije uspela." };
    }
    try {
      if (parsed.data.kind === "buyer") {
        await getCommerce().createBuyerProfile({
          userId,
          name: parsed.data.name,
          email: parsed.data.email,
          businessName: parsed.data.businessName,
          phone: parsed.data.phone,
          address: parsed.data.address,
          city: parsed.data.city,
          pib: parsed.data.pib,
          mb: normalizeMb(parsed.data.mb) ?? "",
          postalCode: normalizePostalCode(parsed.data.postalCode) ?? "",
          bankAccount: "",
          confirmationEmail: parsed.data.confirmationEmail,
        });
      } else {
        await getCommerce().createOrganization({
          userId,
          userName: parsed.data.name,
          userEmail: parsed.data.email,
          name: parsed.data.organizationName,
          slug,
          phone: parsed.data.phone,
          audience: parsed.data.audience,
        });
        const { ensureShopDomainAlias } = await import("@/lib/netlify-shop-host");
        const host = await ensureShopDomainAlias(slug);
        if (!host.ok) console.error("[shop-host]", slug, host.reason);
      }
    } catch (error) {
      await removeUnfinishedSignup(userId);
      throw error;
    }
    const next = requestedNext !== "/dashboard" ? requestedNext : "";
    const delivery = await deliverSignupConfirmationEmail({
      to: parsed.data.email,
      name: parsed.data.name,
      confirmUrl: signupConfirmUrl(getAppUrl(), tokenHash, next),
    }).catch(() => ({ delivery: "failed" as const, reason: "" }));
    if (delivery.delivery === "failed") {
      await removeUnfinishedSignup(userId);
      const detail = delivery.reason ? ` ${delivery.reason}` : "";
      return { error: `Nismo uspeli da pošaljemo email za potvrdu.${detail}` };
    }
    redirect(next ? `/signup/potvrda?next=${encodeURIComponent(next)}` : "/signup/potvrda");
  } catch (error) {
    if (error instanceof DataError) return { error: error.message };
    throw error;
  }
}

export async function resendSignupConfirmationAction(
  _prev: ConfirmationState,
  formData: FormData,
): Promise<ConfirmationState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNextPath(String(formData.get("next") ?? ""));
  if (!zEmail(email)) return { error: "Unesite ispravnu email adresu." };
  const message = "Ako nalog čeka potvrdu, poslali smo novi link.";
  if (getDataMode() !== "supabase") return { message, sentAt: Date.now() };
  const fingerprint = await requestFingerprint();
  const allowed =
    (await consumeActionLimit("confirm-ip", fingerprint, 5, 15 * 60)) &&
    (await consumeActionLimit("confirm-email", email, 3, 15 * 60));
  if (!allowed) return { error: "Previše zahteva. Sačekajte nekoliko minuta." };

  const { getServiceClient } = await import("@/lib/supabase/admin");
  const admin = getServiceClient();
  const profile = await admin.from("profiles").select("id, name").eq("email", email).maybeSingle();
  if (!profile.data || profile.error) return { message, sentAt: Date.now() };
  const user = await admin.auth.admin.getUserById(String(profile.data.id));
  if (user.error || !user.data.user || user.data.user.email_confirmed_at) {
    return { message, sentAt: Date.now() };
  }

  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: getAppUrl() },
  });
  const token = link.data.properties?.hashed_token ?? "";
  if (!link.error && token) {
    await deliverSignupConfirmationEmail({
      to: email,
      name: String(profile.data.name ?? ""),
      confirmUrl: signupConfirmUrl(getAppUrl(), token, next, "magiclink"),
    });
  }
  return { message, sentAt: Date.now() };
}

async function removeUnfinishedSignup(userId: string) {
  const { getServiceClient } = await import("@/lib/supabase/admin");
  const admin = getServiceClient();
  const member = await admin.from("organization_members").select("organization_id").eq("user_id", userId).maybeSingle();
  const organizationId = member.data?.organization_id;
  if (organizationId) await admin.from("organizations").delete().eq("id", organizationId);
  await admin.auth.admin.deleteUser(userId);
}

function emailAlreadyUsed(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "email_exists" || message.includes("already") || message.includes("registered");
}

async function freeSlug(name: string) {
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const candidate = slugCandidate(name, attempt);
    if (RESERVED_SLUGS.has(candidate)) continue;
    if (!(await getCommerce().isSlugTaken(candidate))) return candidate;
  }
  throw new DataError("Ne možemo da napravimo adresu od ovog naziva.", "conflict");
}

function zEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function logoutAction() {
  if (getDataMode() === "demo") {
    await clearDemoSession();
  } else {
    const { createSupabaseServer } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
