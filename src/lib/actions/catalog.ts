"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";
import { DataError } from "@/lib/errors";
import { storeImage } from "@/lib/media";
import { parseProductCsv } from "@/lib/csv";
import { fieldErrors, organizationSchema, productFormSchema, toProductInput } from "@/lib/validators";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  message?: string;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function saveProductAction(formData: FormData): Promise<FormState & { id?: string }> {
  const session = await requireSession();
  const parsed = productFormSchema.safeParse({
    name: text(formData, "name"),
    sku: text(formData, "sku"),
    description: text(formData, "description"),
    categoryId: text(formData, "categoryId"),
    newCategory: text(formData, "newCategory"),
    unit: text(formData, "unit"),
    price: text(formData, "price"),
    minQuantity: text(formData, "minQuantity"),
    active: text(formData, "active") === "true",
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Proverite podatke o proizvodu.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  try {
    const image = formData.get("image");
    const imageUrl = image instanceof File ? await storeImage(session.organization.id, image) : undefined;
    const input = toProductInput(parsed.data, imageUrl ?? undefined);
    const productId = text(formData, "id");
    const product = productId
      ? await getCommerce().updateProduct(session.organization.id, productId, input)
      : await getCommerce().createProduct(session.organization.id, input);
    if (!product) return { error: "Proizvod nije pronađen." };
    revalidatePath("/products");
    revalidatePath(`/products/${product.id}`);
    revalidatePath(`/s/${session.organization.slug}`);
    return { ok: true, id: product.id, message: "Proizvod je sačuvan." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Čuvanje nije uspelo." };
  }
}

export async function setProductActiveAction(productId: string, active: boolean) {
  const session = await requireSession();
  const product = await getCommerce().getProduct(session.organization.id, productId);
  if (!product) return { ok: false, error: "Proizvod nije pronađen." };
  await getCommerce().updateProduct(session.organization.id, productId, {
    name: product.name,
    sku: product.sku,
    description: product.description,
    categoryId: product.categoryId,
    newCategory: "",
    unit: product.unit,
    pricePara: product.pricePara,
    minQuantity: product.minQuantity,
    active,
  });
  revalidatePath("/products");
  revalidatePath(`/s/${session.organization.slug}`);
  return { ok: true };
}

export async function importProductsAction(csvText: string): Promise<FormState & { created?: number }> {
  const session = await requireSession();
  const parsed = parseProductCsv(csvText);
  if (parsed.rows.length === 0) {
    return {
      error: parsed.errors[0]?.message ?? "Nijedan proizvod nije prepoznat.",
    };
  }
  const result = await getCommerce().importProducts(session.organization.id, parsed.rows);
  revalidatePath("/products");
  revalidatePath(`/s/${session.organization.slug}`);
  const skipped = [...parsed.errors, ...result.errors];
  return {
    ok: true,
    created: result.created,
    message:
      skipped.length > 0
        ? `Uvezeno je ${result.created} proizvoda. Preskočeno redova: ${skipped.length}.`
        : `Uvezeno je ${result.created} proizvoda.`,
  };
}

export async function updateSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  const parsed = organizationSchema.safeParse({
    name: text(formData, "name"),
    slug: text(formData, "slug"),
    email: text(formData, "email"),
    notificationEmail: text(formData, "notificationEmail"),
    phone: text(formData, "phone"),
    address: text(formData, "address"),
    city: text(formData, "city"),
    pib: text(formData, "pib"),
    mb: text(formData, "mb"),
    logoUrl: text(formData, "logoUrl"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Proverite podešavanja.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  try {
    await getCommerce().updateOrganization(session.organization.id, {
      ...parsed.data,
      logoUrl: parsed.data.logoUrl || null,
    });
  } catch (error) {
    if (error instanceof DataError) {
      return { error: error.message, fieldErrors: { slug: error.message } };
    }
    throw error;
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath(`/s/${parsed.data.slug}`);
  return { ok: true, message: "Podešavanja su sačuvana." };
}
