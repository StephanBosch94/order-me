import type { Metadata } from "next";

import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/page-header";
import { requireSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";

export const metadata: Metadata = { title: "Novi proizvod" };

export default async function NewProductPage() {
  const session = await requireSession();
  const categories = await getCommerce().listCategories(session.organization.id);
  return (
    <div>
      <PageHeader title="Novi proizvod" description="Slika i šifra nisu obavezni. Proizvod odmah može da bude vidljiv kupcima." />
      <ProductForm categories={categories} />
    </div>
  );
}
