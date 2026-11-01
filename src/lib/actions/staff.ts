"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";
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
    await getCommerce().addStaffMember(session.organization.id, {
      name: parsed.data.name,
      email: parsed.data.email.trim().toLowerCase(),
      password: parsed.data.password,
    });
    revalidatePath("/zaposleni");
    return { ok: true, message: "Zaposleni je dodat. Može da se prijavi na ovu prodavnicu." };
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
