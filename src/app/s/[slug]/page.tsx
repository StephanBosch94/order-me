import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Storefront } from "@/components/storefront/storefront";
import { getSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getCommerce().getPublicCatalog(slug);
  return { title: catalog ? catalog.supplier.name : "Poručivanje" };
}

export default async function SupplierPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getCommerce().getPublicCatalog(slug);
  if (!catalog) notFound();
  if (catalog.supplier.channel === "b2c") redirect(`/shop/${catalog.supplier.slug}`);
  const session = await getSession();
  return <Storefront catalog={catalog} buyer={session?.kind === "buyer" ? session : null} />;
}
