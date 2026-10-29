"use server";

import { redirect } from "next/navigation";

import { requireBuyerSession } from "@/lib/auth";
import { businessPath, sellsToBusinesses, sellsToConsumers, storePath } from "@/lib/constants";
import { getCommerce } from "@/lib/data";
import { slugify } from "@/lib/text";

export async function openSupplierAction(formData: FormData) {
  await requireBuyerSession();
  const slug = slugify(String(formData.get("slug") ?? ""));
  if (!slug) redirect("/kupac?nedostaje=1");
  const catalog = await getCommerce().getPublicCatalog(slug);
  if (!catalog) redirect("/kupac?nedostaje=1");
  if (sellsToBusinesses(catalog.supplier.audience) && !sellsToConsumers(catalog.supplier.audience)) {
    redirect(businessPath(catalog.supplier.slug));
  }
  redirect(storePath(catalog.supplier.slug));
}
