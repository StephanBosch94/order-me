"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { isCompanyBuyer, normalizeMb, normalizePostalCode } from "@/lib/buyer";
import { storePath } from "@/lib/constants";
import { getCommerce } from "@/lib/data";
import type { UpdateBuyerInput } from "@/lib/data/repository";
import type { BuyerAccount } from "@/lib/data/types";
import { DataError } from "@/lib/errors";
import { companyBuyerProfileSchema, fieldErrors, personBuyerProfileSchema } from "@/lib/validators";

export type BuyerAccountState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  buyer?: BuyerAccount;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function keptBusinessName(session: BuyerAccount, name: string) {
  const current = session.businessName.trim();
  if (!current) return "";
  if (current === session.name.trim()) return name;
  return session.businessName;
}

export async function updateBuyerAccountAction(
  _prev: BuyerAccountState,
  formData: FormData,
): Promise<BuyerAccountState> {
  const session = await getSession();
  if (!session || session.kind !== "buyer") {
    return { error: "Prijavite se da biste izmenili nalog." };
  }

  let next: UpdateBuyerInput;
  if (isCompanyBuyer(session)) {
    const parsed = companyBuyerProfileSchema.safeParse({
      name: text(formData, "name"),
      businessName: text(formData, "businessName"),
      phone: text(formData, "phone"),
      address: text(formData, "address"),
      city: text(formData, "city"),
      pib: text(formData, "pib"),
      mb: text(formData, "mb"),
      postalCode: text(formData, "postalCode"),
      confirmationEmail: text(formData, "confirmationEmail"),
    });
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Proverite unete podatke.",
        fieldErrors: fieldErrors(parsed.error),
      };
    }
    const mb = normalizeMb(parsed.data.mb);
    const postalCode = normalizePostalCode(parsed.data.postalCode);
    if (!mb || !postalCode) {
      return {
        error: "Proverite matični broj i poštanski broj.",
        fieldErrors: {
          ...(!mb ? { mb: "Matični broj ima 8 cifara." } : {}),
          ...(!postalCode ? { postalCode: "Poštanski broj ima 5 cifara." } : {}),
        },
      };
    }
    next = { ...parsed.data, bankAccount: session.bankAccount, mb, postalCode };
  } else {
    const parsed = personBuyerProfileSchema.safeParse({
      name: text(formData, "name"),
      phone: text(formData, "phone"),
      address: text(formData, "address"),
      city: text(formData, "city"),
      postalCode: text(formData, "postalCode"),
      confirmationEmail: text(formData, "confirmationEmail"),
    });
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Proverite unete podatke.",
        fieldErrors: fieldErrors(parsed.error),
      };
    }
    const postalCode = normalizePostalCode(parsed.data.postalCode);
    if (!postalCode) {
      return {
        error: "Poštanski broj ima 5 cifara.",
        fieldErrors: { postalCode: parsed.data.postalCode.trim() ? "Poštanski broj ima 5 cifara." : "Unesite poštanski broj." },
      };
    }
    next = {
      name: parsed.data.name,
      businessName: keptBusinessName(session, parsed.data.name),
      phone: parsed.data.phone,
      address: parsed.data.address,
      city: parsed.data.city,
      pib: session.pib,
      mb: session.mb,
      postalCode,
      bankAccount: session.bankAccount,
      confirmationEmail: parsed.data.confirmationEmail,
    };
  }

  try {
    await getCommerce().updateBuyerProfile(session.userId, next);
  } catch (error) {
    if (error instanceof DataError) return { error: error.message };
    throw error;
  }

  const slug = text(formData, "slug").trim();
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    revalidatePath(storePath(slug), "layout");
  }
  revalidatePath("/kupac");

  return {
    ok: true,
    buyer: {
      kind: "buyer",
      userId: session.userId,
      email: session.email,
      ...next,
    },
  };
}
