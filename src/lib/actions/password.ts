"use server";

import { getSession, setDemoSession } from "@/lib/auth";
import { getDataMode } from "@/lib/config";
import { getCommerce, getDemoIdentity } from "@/lib/data";
import { deliverPasswordChangedEmail } from "@/lib/email/password";
import { DataError } from "@/lib/errors";
import { signDemoSession } from "@/lib/session-token";
import { fieldErrors, passwordChangeSchema } from "@/lib/validators";

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
