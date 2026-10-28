"use server";

import { redirect } from "next/navigation";

import { requireBuyerSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";
import { slugify } from "@/lib/text";

export async function openSupplierAction(formData: FormData) {
  await requireBuyerSession();
  const slug = slugify(String(formData.get("slug") ?? ""));
  if (!slug) redirect("/kupac?nedostaje=1");
  const catalog = await getCommerce().getPublicCatalog(slug);
  if (!catalog) redirect("/kupac?nedostaje=1");
  redirect(`/s/${catalog.supplier.slug}`);
}
