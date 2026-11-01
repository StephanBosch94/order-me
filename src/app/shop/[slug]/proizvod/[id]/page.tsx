import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SupplierLogo } from "@/components/brand/supplier-logo";
import { StoreAccountLinks } from "@/components/shop/account-links";
import { BuyerMenu } from "@/components/shop/buyer-menu";
import { ClosedStore } from "@/components/shop/closed-store";
import { ProductDetail } from "@/components/shop/product-detail";
import { getSession } from "@/lib/auth";
import { supplierTheme } from "@/lib/color";
import { storePath } from "@/lib/constants";
import { getCommerce } from "@/lib/data";
import type { Product } from "@/lib/data/types";

function otherProducts(products: Product[], current: Product) {
  const rest = products.filter((item) => item.id !== current.id);
  const same = rest.filter((item) => item.categoryId && item.categoryId === current.categoryId);
  const different = rest.filter((item) => item.categoryId !== current.categoryId);
  return [...same, ...different].slice(0, 5);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug, id } = await params;
  const catalog = await getCommerce().getPublicCatalog(slug);
  const product = catalog?.products.find((item) => item.id === id);
  return { title: product && catalog ? `${product.name} · ${catalog.supplier.name}` : "Proizvod" };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const catalog = await getCommerce().getPublicCatalog(slug);
  if (!catalog) notFound();
  if (catalog.closedMessage) {
    return <ClosedStore name={catalog.supplier.name} message={catalog.closedMessage} />;
  }
  const product = catalog.products.find((item) => item.id === id);
  if (!product) notFound();

  const session = await getSession();
  const buyer = session?.kind === "buyer" ? session : null;
  const orders = buyer
    ? (await getCommerce().listBuyerOrders(buyer.userId)).filter((order) => order.supplierSlug === catalog.supplier.slug)
    : [];
  const backHref = storePath(catalog.supplier.slug);
  const category = catalog.categories.find((item) => item.id === product.categoryId);

  return (
    <div className="min-h-dvh bg-background" style={supplierTheme(catalog.supplier.brandColor)}>
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href={backHref} className="flex min-w-0 items-center gap-3">
            <SupplierLogo name={catalog.supplier.name} logoUrl={catalog.supplier.logoUrl} className="size-10" />
            <span className="truncate text-sm font-semibold">{catalog.supplier.name}</span>
          </Link>
          <div className="flex items-center gap-3">
            <StoreAccountLinks
              slug={catalog.supplier.slug}
              buyer={buyer}
              showAccount={session?.kind !== "supplier"}
            />
            {buyer ? (
              <BuyerMenu
                buyer={buyer}
                orders={orders}
                accountHref={`${backHref}?nalog=1`}
                repeatBase={backHref}
              />
            ) : null}
          </div>
        </div>
      </header>
      <ProductDetail
        key={product.id}
        slug={catalog.supplier.slug}
        product={product}
        categoryName={category?.name ?? null}
        business={false}
        backHref={backHref}
        others={otherProducts(catalog.products, product)}
      />
    </div>
  );
}
