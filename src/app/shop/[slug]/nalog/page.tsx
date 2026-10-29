import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CustomerSignup } from "@/components/account/customer-signup";
import { getSession } from "@/lib/auth";
import { storePath } from "@/lib/constants";
import { getCommerce } from "@/lib/data";

export const metadata: Metadata = { title: "Nalog kupca" };

export default async function ShopAccountPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const catalog = await getCommerce().getPublicCatalog(slug);
  if (!catalog) notFound();
  const session = await getSession();
  if (session?.kind === "buyer") redirect(storePath(catalog.supplier.slug));
  if (session) redirect("/dashboard");
  return <CustomerSignup catalog={catalog} />;
}
