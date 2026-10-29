import { notFound, redirect } from "next/navigation";

import { getCommerce } from "@/lib/data";

export default async function LegacyAccountPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getCommerce().getPublicCatalog(slug);
  if (!catalog) notFound();
  redirect(`/shop/${catalog.supplier.slug}/nalog`);
}
