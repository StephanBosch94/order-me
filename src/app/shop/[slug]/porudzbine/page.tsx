import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BuyerOrdersFrame } from "@/components/shop/buyer-orders";
import { CompanyOrders, OrderList } from "@/components/shop/shop";
import { getSession } from "@/lib/auth";
import { isCompanyBuyer } from "@/lib/buyer";
import { isDemoMode } from "@/lib/config";
import { ordersPath, storePath } from "@/lib/constants";
import { getCommerce } from "@/lib/data";
import { demoShopRole, type DemoRole } from "@/lib/demo-shops";

export const metadata: Metadata = { title: "Porudžbine" };

export default async function BuyerOrdersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const catalog = await getCommerce().getPublicCatalog(slug);
  if (!catalog) notFound();
  const session = await getSession();
  const next = ordersPath(catalog.supplier.slug);
  const demo = isDemoMode() && Boolean(demoShopRole(catalog.supplier.slug));
  if (session?.kind !== "buyer") {
    if (demo && !session) redirect(`/demo/ulaz?slug=${encodeURIComponent(catalog.supplier.slug)}&role=prodavac`);
    redirect(session ? "/dashboard" : `/login?next=${encodeURIComponent(next)}`);
  }
  const demoRole: DemoRole | null = demo ? "kupac" : null;
  const orders = (await getCommerce().listBuyerOrders(session.userId)).filter(
    (order) => order.supplierSlug === catalog.supplier.slug,
  );
  const company = isCompanyBuyer(session);
  const shopHref = storePath(catalog.supplier.slug);

  return (
    <BuyerOrdersFrame
      slug={catalog.supplier.slug}
      name={catalog.supplier.name}
      logoUrl={catalog.supplier.logoUrl}
      brandColor={catalog.supplier.brandColor}
      audience={catalog.supplier.audience}
      buyer={session}
      showAccount={true}
      products={catalog.products}
      demoRole={demoRole}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {company ? (
          <div className="mb-6 inline-flex rounded-lg border border-border bg-card p-1" role="tablist" aria-label="Prodavnica">
            <Link href={shopHref} className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-foreground">
              Prodavnica
            </Link>
            <span className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground" aria-current="page">
              Porudžbine
            </span>
          </div>
        ) : (
          <Link
            href={shopHref}
            className="mb-3 inline-flex min-h-11 items-center py-2 text-base font-medium text-foreground underline decoration-foreground/40 underline-offset-4 hover:decoration-foreground"
          >
            Nazad na proizvode
          </Link>
        )}
        {company ? (
          <CompanyOrders orders={orders} repeatBase={shopHref} />
        ) : (
          <OrderList orders={orders} repeatBase={shopHref} />
        )}
      </div>
    </BuyerOrdersFrame>
  );
}
