import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClosedStore } from "@/components/shop/closed-store";
import { ProductDetail } from "@/components/shop/product-detail";
import { ProductFrame } from "@/components/shop/product-frame";
import { getSession } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import { storePath } from "@/lib/constants";
import { getCommerce } from "@/lib/data";
import { demoShopRole, type DemoRole } from "@/lib/demo-shops";
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
  const demo = isDemoMode() && Boolean(demoShopRole(catalog.supplier.slug));
  const buyer = session?.kind === "buyer" ? session : null;
  const demoRole: DemoRole | null = demo ? (buyer ? "kupac" : "prodavac") : null;
  const backHref = storePath(catalog.supplier.slug);
  const category = catalog.categories.find((item) => item.id === product.categoryId);

  return (
    <ProductFrame
      slug={catalog.supplier.slug}
      name={catalog.supplier.name}
      logoUrl={catalog.supplier.logoUrl}
      brandColor={catalog.supplier.brandColor}
      audience={catalog.supplier.audience}
      buyer={buyer}
      showAccount={session?.kind !== "supplier"}
      products={catalog.products}
      demoShop={demo}
      demoRole={demoRole}
      accountName={session?.kind === "supplier" ? session.name : null}
    >
      <ProductDetail
        key={product.id}
        slug={catalog.supplier.slug}
        product={product}
        categoryName={category?.name ?? null}
        business={false}
        backHref={backHref}
        others={otherProducts(catalog.products, product)}
      />
    </ProductFrame>
  );
}
