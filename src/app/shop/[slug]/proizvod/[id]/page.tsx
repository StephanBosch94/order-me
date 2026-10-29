import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SupplierLogo } from "@/components/brand/supplier-logo";
import { StoreAccountLinks } from "@/components/shop/account-links";
import { ProductDetail } from "@/components/shop/product-detail";
import { getSession } from "@/lib/auth";
import { supplierTheme } from "@/lib/color";
import { businessPath, DEMO_SLUGS, shopMode, storePath } from "@/lib/constants";
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
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ za?: string }>;
}) {
  const { slug, id } = await params;
  const query = await searchParams;
  const catalog = await getCommerce().getPublicCatalog(slug);
  if (!catalog) notFound();
  const product = catalog.products.find((item) => item.id === id);
  if (!product) notFound();

  const session = await getSession();
  const buyer = session?.kind === "buyer" ? session : null;
  const business = shopMode(catalog.supplier.audience, query.za) === "pravna";
  const backHref = business ? businessPath(catalog.supplier.slug) : storePath(catalog.supplier.slug);
  const category = catalog.categories.find((item) => item.id === product.categoryId);

  return (
    <div className="min-h-dvh bg-background" style={supplierTheme(catalog.supplier.brandColor)}>
      {DEMO_SLUGS.has(catalog.supplier.slug) ? (
        <div className="border-b border-border bg-zinc-50">
          <div className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Nazad na sajt
            </Link>
          </div>
        </div>
      ) : null}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href={backHref} className="flex min-w-0 items-center gap-3">
            <SupplierLogo name={catalog.supplier.name} logoUrl={catalog.supplier.logoUrl} className="size-10" />
            <span className="truncate text-sm font-semibold">{catalog.supplier.name}</span>
          </Link>
          <StoreAccountLinks
            slug={catalog.supplier.slug}
            buyer={buyer}
            showAccount={session?.kind !== "supplier"}
            business={business}
          />
        </div>
      </header>
      <ProductDetail
        key={product.id}
        slug={catalog.supplier.slug}
        product={product}
        categoryName={category?.name ?? null}
        business={business}
        backHref={backHref}
        others={otherProducts(catalog.products, product)}
      />
    </div>
  );
}
