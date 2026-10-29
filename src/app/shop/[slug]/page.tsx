import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Shop } from "@/components/shop/shop";
import { getSession } from "@/lib/auth";
import { isCompanyBuyer } from "@/lib/buyer";
import { getCommerce } from "@/lib/data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getCommerce().getPublicCatalog(slug);
  return { title: catalog ? catalog.supplier.name : "Prodavnica" };
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ponovi?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const catalog = await getCommerce().getPublicCatalog(slug);
  if (!catalog) notFound();
  const session = await getSession();
  const buyer = session?.kind === "buyer" ? session : null;
  const company = buyer && isCompanyBuyer(buyer) ? buyer : null;
  const orders = company
    ? (await getCommerce().listBuyerOrders(company.userId)).filter((order) => order.supplierSlug === catalog.supplier.slug)
    : [];

  return (
    <Shop
      catalog={catalog}
      buyer={buyer}
      showAccount={session?.kind !== "supplier"}
      orders={orders}
      repeatOrderId={query.ponovi}
    />
  );
}
