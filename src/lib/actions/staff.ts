"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { landingPath, requireSession, setDemoSession } from "@/lib/auth";
import { getAppUrl, getDataMode } from "@/lib/config";
import { getCommerce, getDemoIdentity } from "@/lib/data";
import { deliverStaffInvite } from "@/lib/email/staff";
import { DataError } from "@/lib/errors";
import { isShopManager, memberRoleLabel } from "@/lib/members";
import { signDemoSession } from "@/lib/session-token";
import { staffInviteUrl } from "@/lib/staff-invite";
import { employeeSchema, fieldErrors, invitePasswordSchema } from "@/lib/validators";

export type EmployeeState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  message?: string;
};

export type InviteState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function addEmployeeAction(_prev: EmployeeState, formData: FormData): Promise<EmployeeState> {
  const session = await requireSession();
  if (!isShopManager(session.role)) {
    return { error: "Samo vlasnik i admin mogu da dodaju zaposlene." };
  }

  const parsed = employeeSchema.safeParse({
    name: text(formData, "name"),
    email: text(formData, "email"),
    role: text(formData, "role"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Proverite unete podatke.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  try {
    const email = parsed.data.email.trim().toLowerCase();
    const invite = await getCommerce().addStaffMember(session.organization.id, {
      name: parsed.data.name,
      email,
      role: parsed.data.role,
    });
    const delivery = await deliverStaffInvite({
      to: email,
      name: parsed.data.name.trim(),
      shopName: session.organization.name,
      roleLabel: memberRoleLabel(parsed.data.role),
      inviteUrl: staffInviteUrl(getAppUrl(), invite.inviteToken, invite.inviteType),
    });
    revalidatePath("/zaposleni");
    if (delivery === "failed") {
      return {
        ok: true,
        message: "Nalog je sačuvan, ali pozivnica nije poslata. Unesite isti email ponovo.",
      };
    }
    if (delivery === "outbox") {
      return {
        ok: true,
        message: "Pozivnica je sačuvana jer slanje emaila još nije podešeno. Zaposleni pravi lozinku preko tog linka.",
      };
    }
    return {
      ok: true,
      message: invite.resent
        ? "Pozivnica je ponovo poslata. Zaposleni pravi lozinku preko linka u emailu."
        : "Pozivnica je poslata. Zaposleni pravi lozinku preko linka u emailu.",
    };
  } catch (error) {
    if (error instanceof DataError) {
      return {
        error: error.message,
        fieldErrors: error.code === "conflict" ? { email: error.message } : undefined,
      };
    }
    throw error;
  }
}

export async function acceptStaffInvite(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const parsed = invitePasswordSchema.safeParse({
    token: text(formData, "token"),
    password: text(formData, "password"),
    confirmPassword: text(formData, "confirmPassword"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Proverite lozinku.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const type = text(formData, "type") === "recovery" ? "recovery" : "invite";
  if (getDataMode() === "demo") {
    try {
      const user = await getDemoIdentity().acceptStaffInvite(parsed.data.token, parsed.data.password);
      const carry = await getDemoIdentity().sessionCarry(user.id);
      await setDemoSession(signDemoSession(user.id, Date.now(), carry));
    } catch (error) {
      if (error instanceof DataError) return { error: error.message };
      throw error;
    }
    redirect("/dashboard");
  }

  const { createSupabaseServer } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: parsed.data.token });
  if (error) return { error: "Pozivnica nije važeća ili je istekla. Zamolite admina da je pošalje ponovo." };

  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Pozivnica nije važeća ili je istekla. Zamolite admina da je pošalje ponovo." };

  const { getServiceClient } = await import("@/lib/supabase/admin");
  const updated = await getServiceClient().auth.admin.updateUserById(data.user.id, { password: parsed.data.password });
  if (updated.error) return { error: "Lozinka nije sačuvana. Pokušajte ponovo." };

  const account = await getCommerce().resolveAccount(data.user.id);
  if (!account) return { error: "Nalog nije završen. Zamolite admina da pošalje pozivnicu ponovo." };
  redirect(await landingPath(account, "/dashboard"));
}
