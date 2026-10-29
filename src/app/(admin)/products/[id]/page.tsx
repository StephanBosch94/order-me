import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/page-header";
import { requireSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";

export const metadata: Metadata = { title: "Izmena proizvoda" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getCommerce().getProduct(session.organization.id, id),
    getCommerce().listCategories(session.organization.id),
  ]);
  if (!product) notFound();
  return (
    <div>
      <PageHeader title="Izmena proizvoda" description={product.name} />
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
