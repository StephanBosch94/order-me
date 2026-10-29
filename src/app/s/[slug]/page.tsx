import { notFound, redirect } from "next/navigation";

import { storePath } from "@/lib/constants";
import { getCommerce } from "@/lib/data";

export default async function LegacySupplierPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getCommerce().getPublicCatalog(slug);
  if (!catalog) notFound();
  redirect(storePath(catalog.supplier.slug));
}
