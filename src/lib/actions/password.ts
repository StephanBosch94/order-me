"use server";

import { getSession, setDemoSession } from "@/lib/auth";
import { getAppUrl, getDataMode } from "@/lib/config";
import { getCommerce, getDemoIdentity } from "@/lib/data";
import { deliverPasswordChangedEmail, deliverPasswordResetEmail } from "@/lib/email/password";
import { DataError } from "@/lib/errors";
import { signDemoSession } from "@/lib/session-token";
import { staffInviteUrl } from "@/lib/staff-invite";
import { fieldErrors, passwordChangeSchema } from "@/lib/validators";
import { consumeActionLimit, requestFingerprint } from "@/lib/rate-limit";
import { z } from "zod";

export type PasswordState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  message?: string;
  savedAt?: number;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function changePasswordAction(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const session = await getSession();
  if (!session) return { error: "Prijavite se da biste promenili lozinku." };
  if (session.kind === "supplier" && session.support) {
    return { error: "Lozinku klijenta ne možete menjati iz pristupa podrške." };
  }

  const parsed = passwordChangeSchema.safeParse({
    currentPassword: text(formData, "currentPassword"),
    nextPassword: text(formData, "nextPassword"),
    confirmPassword: text(formData, "confirmPassword"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Proverite lozinku.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  let account: { email: string; name: string };
  try {
    account = await getCommerce().changePassword(session.userId, parsed.data.currentPassword, parsed.data.nextPassword);
  } catch (error) {
    if (error instanceof DataError) return { error: error.message };
    throw error;
  }

  if (getDataMode() === "demo") {
    const carry = await getDemoIdentity().sessionCarry(session.userId);
    await setDemoSession(signDemoSession(session.userId, Date.now(), carry));
  }

  const delivery = await deliverPasswordChangedEmail({ to: account.email, name: account.name || session.name });
  return passwordChangedMessage(delivery);
}

const loginEmail = z.email("Unesite ispravnu email adresu.");

export async function requestPasswordResetAction(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const parsed = loginEmail.safeParse(text(formData, "email").trim());
  if (!parsed.success) {
    return { error: "Unesite ispravnu email adresu.", fieldErrors: { email: "Unesite ispravnu email adresu." } };
  }

  const message = "Ako nalog postoji, poslali smo link za novu lozinku.";
  if (getDataMode() !== "supabase") return { ok: true, savedAt: Date.now(), message };

  const email = parsed.data.toLowerCase();
  const fingerprint = await requestFingerprint();
  const allowed =
    (await consumeActionLimit("recovery-ip", fingerprint, 5, 15 * 60)) &&
    (await consumeActionLimit("recovery-email", email, 3, 15 * 60));
  if (!allowed) return { error: "Previše zahteva. Sačekajte nekoliko minuta." };

  const { getServiceClient } = await import("@/lib/supabase/admin");
  const admin = getServiceClient();
  const profile = await admin.from("profiles").select("id, name, email").eq("email", email).maybeSingle();
  if (!profile.data || profile.error) return { ok: true, savedAt: Date.now(), message };

  const link = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: getAppUrl() },
  });
  const token = link.data.properties?.hashed_token ?? "";
  if (link.error || !token) return { ok: true, savedAt: Date.now(), message };

  await deliverPasswordResetEmail({
    to: email,
    name: String(profile.data.name ?? ""),
    resetUrl: staffInviteUrl(getAppUrl(), token, "recovery"),
  });
  return { ok: true, savedAt: Date.now(), message };
}

export async function changePasswordFromLoginAction(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const emailParsed = loginEmail.safeParse(text(formData, "email").trim());
  const parsed = passwordChangeSchema.safeParse({
    currentPassword: text(formData, "currentPassword"),
    nextPassword: text(formData, "nextPassword"),
    confirmPassword: text(formData, "confirmPassword"),
  });
  if (!emailParsed.success || !parsed.success) {
    const passwordError = parsed.success ? undefined : parsed.error.issues[0]?.message;
    return {
      error: emailParsed.success ? passwordError ?? "Proverite lozinku." : "Unesite ispravnu email adresu.",
      fieldErrors: {
        ...(emailParsed.success ? {} : { email: "Unesite ispravnu email adresu." }),
        ...(parsed.success ? {} : fieldErrors(parsed.error)),
      },
    };
  }

  const email = emailParsed.data.toLowerCase();
  let account: { email: string; name: string };
  let userId = "";
  try {
    if (getDataMode() === "demo") {
      const user = await getDemoIdentity().verifyCredentials(email, parsed.data.currentPassword);
      if (!user) return { error: "Proverite email i trenutnu lozinku." };
      userId = user.id;
      account = await getCommerce().changePassword(user.id, parsed.data.currentPassword, parsed.data.nextPassword);
    } else {
      const found = await verifySupabasePassword(email, parsed.data.currentPassword);
      if (!found) return { error: "Proverite email i trenutnu lozinku." };
      userId = found;
      account = await getCommerce().changePassword(found, parsed.data.currentPassword, parsed.data.nextPassword);
    }
  } catch (error) {
    if (error instanceof DataError) return { error: error.message };
    throw error;
  }

  if (getDataMode() === "demo") {
    const session = await getSession();
    if (session?.userId === userId) {
      const carry = await getDemoIdentity().sessionCarry(userId);
      await setDemoSession(signDemoSession(userId, Date.now(), carry));
    }
  }

  return passwordChangedMessage(await deliverPasswordChangedEmail({ to: account.email, name: account.name }));
}

async function verifySupabasePassword(email: string, password: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const checker = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const check = await checker.auth.signInWithPassword({ email, password });
  return check.data.user?.id ?? null;
}

function passwordChangedMessage(delivery: Awaited<ReturnType<typeof deliverPasswordChangedEmail>>): PasswordState {
  const savedAt = Date.now();
  if (delivery === "outbox") {
    return {
      ok: true,
      savedAt,
      message: "Lozinka je promenjena. Obaveštenje je sačuvano jer slanje emaila još nije podešeno.",
    };
  }
  if (delivery === "failed") {
    return { ok: true, savedAt, message: "Lozinka je promenjena. Obaveštenje nije poslato." };
  }
  return { ok: true, savedAt, message: "Lozinka je promenjena. Poslali smo obaveštenje na email." };
}
