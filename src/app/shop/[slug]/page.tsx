import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Shop } from "@/components/shop/shop";
import { getSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getCommerce().getPublicCatalog(slug);
  return { title: catalog ? catalog.supplier.name : "Prodavnica" };
}

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getCommerce().getPublicCatalog(slug);
  if (!catalog) notFound();
  if (catalog.supplier.channel !== "b2c") redirect(`/s/${catalog.supplier.slug}`);
  const session = await getSession();
  return <Shop catalog={catalog} buyer={session?.kind === "buyer" ? session : null} showAccount={session?.kind !== "supplier"} />;
}
