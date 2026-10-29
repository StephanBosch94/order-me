import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CustomerSignup } from "@/components/account/customer-signup";
import { getSession } from "@/lib/auth";
import { shopMode } from "@/lib/constants";
import { getCommerce } from "@/lib/data";

export const metadata: Metadata = { title: "Nalog kupca" };

export default async function ShopAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ za?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const catalog = await getCommerce().getPublicCatalog(slug);
  if (!catalog) notFound();
  const session = await getSession();
  const mode = shopMode(catalog.supplier.audience, query.za);
  if (session?.kind === "buyer") redirect(mode === "pravna" ? `/shop/${catalog.supplier.slug}?za=firme` : `/shop/${catalog.supplier.slug}`);
  if (session) redirect("/dashboard");
  return <CustomerSignup catalog={catalog} business={mode === "pravna"} />;
}
