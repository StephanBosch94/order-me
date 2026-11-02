import type { Metadata } from "next";
import Link from "next/link";

import { StaffOrderForm } from "@/components/admin/staff-order-form";
import { PageHeader } from "@/components/admin/page-header";
import { requireSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";

export const metadata: Metadata = { title: "Nova porudžbina" };

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ kupac?: string }>;
}) {
  const session = await requireSession();
  const { kupac } = await searchParams;
  const [customers, products] = await Promise.all([
    getCommerce().listCustomers(session.organization.id),
    getCommerce().listProducts(session.organization.id),
  ]);

  return (
    <div>
      <Link href="/orders" className="text-sm text-muted-foreground hover:text-foreground">
        Sve porudžbine
      </Link>
      <div className="mt-3">
        <PageHeader
          title="Nova porudžbina"
          description="Unesite porudžbinu za postojećeg kupca. Cena se uzima iz kataloga."
        />
      </div>
      {customers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Prvo dodajte kupca.{" "}
          <Link href="/customers/new" className="font-medium text-foreground underline">
            Novi kupac
          </Link>
        </p>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Katalog je prazan.{" "}
          <Link href="/products/new" className="font-medium text-foreground underline">
            Dodajte proizvod
          </Link>
        </p>
      ) : (
        <StaffOrderForm customers={customers} products={products} customerId={kupac} />
      )}
    </div>
  );
}
