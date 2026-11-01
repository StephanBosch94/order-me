import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClosedStore } from "@/components/shop/closed-store";
import { Shop } from "@/components/shop/shop";
import { getSession } from "@/lib/auth";
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
  searchParams: Promise<{ ponovi?: string; nalog?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const catalog = await getCommerce().getPublicCatalog(slug);
  if (!catalog) notFound();
  if (catalog.closedMessage) {
    return <ClosedStore name={catalog.supplier.name} message={catalog.closedMessage} />;
  }
  const session = await getSession();
  const buyer = session?.kind === "buyer" ? session : null;
  const orders = buyer
    ? (await getCommerce().listBuyerOrders(buyer.userId)).filter((order) => order.supplierSlug === catalog.supplier.slug)
    : [];
  return (
    <Shop
      catalog={catalog}
      buyer={buyer}
      showAccount={session?.kind !== "supplier"}
      orders={orders}
      repeatOrderId={query.ponovi}
      openAccount={query.nalog === "1"}
    />
  );
}
