import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CustomerSignup } from "@/components/account/customer-signup";
import { getSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";

export const metadata: Metadata = { title: "Nalog kupca" };

export default async function WholesaleAccountPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getCommerce().getPublicCatalog(slug);
  if (!catalog) notFound();
  if (catalog.supplier.channel === "b2c") redirect(`/shop/${catalog.supplier.slug}/nalog`);
  const session = await getSession();
  if (session?.kind === "buyer") redirect(`/s/${catalog.supplier.slug}`);
  if (session) redirect("/dashboard");
  return <CustomerSignup catalog={catalog} />;
}
