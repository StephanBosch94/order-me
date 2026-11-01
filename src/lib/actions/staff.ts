"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";
import { deliverStaffInvite } from "@/lib/email/staff";
import { DataError } from "@/lib/errors";
import { employeeSchema, fieldErrors } from "@/lib/validators";

export type EmployeeState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  message?: string;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function addEmployeeAction(_prev: EmployeeState, formData: FormData): Promise<EmployeeState> {
  const session = await requireSession();
  if (session.role !== "owner") {
    return { error: "Samo vlasnik može da dodaje zaposlene." };
  }

  const parsed = employeeSchema.safeParse({
    name: text(formData, "name"),
    email: text(formData, "email"),
    password: text(formData, "password"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Proverite unete podatke.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  try {
    const email = parsed.data.email.trim().toLowerCase();
    await getCommerce().addStaffMember(session.organization.id, {
      name: parsed.data.name,
      email,
      password: parsed.data.password,
    });
    const delivery = await deliverStaffInvite({
      to: email,
      name: parsed.data.name.trim(),
      shopName: session.organization.name,
      password: parsed.data.password,
    });
    revalidatePath("/zaposleni");
    if (delivery === "failed") {
      return {
        ok: true,
        message: "Zaposleni je dodat. Pozivnica nije poslata. Pošaljite mu lozinku ručno.",
      };
    }
    if (delivery === "outbox") {
      return {
        ok: true,
        message: "Zaposleni je dodat. Pozivnica je sačuvana jer slanje emaila još nije podešeno.",
      };
    }
    return { ok: true, message: "Zaposleni je dodat. Pozivnica je poslata na email." };
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
