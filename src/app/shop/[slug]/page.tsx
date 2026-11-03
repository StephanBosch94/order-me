import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ClosedStore } from "@/components/shop/closed-store";
import { Shop } from "@/components/shop/shop";
import { getSession } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import { ordersPath } from "@/lib/constants";
import { getCommerce } from "@/lib/data";
import { demoShopRole, type DemoRole } from "@/lib/demo-shops";

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
  searchParams: Promise<{ ponovi?: string; nalog?: string; porudzbine?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const catalog = await getCommerce().getPublicCatalog(slug);
  if (catalog && query.porudzbine === "1") redirect(ordersPath(catalog.supplier.slug));
  if (!catalog) notFound();
  if (catalog.closedMessage) {
    return <ClosedStore name={catalog.supplier.name} message={catalog.closedMessage} />;
  }
  const session = await getSession();
  const demo = isDemoMode() && Boolean(demoShopRole(catalog.supplier.slug));
  const buyer = session?.kind === "buyer" ? session : null;
  const demoRole: DemoRole | null = demo ? (buyer ? "kupac" : "prodavac") : null;
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
      demoShop={demo}
      demoRole={demoRole}
      accountName={session?.kind === "supplier" ? session.name : null}
    />
  );
}
