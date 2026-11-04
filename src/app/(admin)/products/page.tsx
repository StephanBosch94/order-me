import type { Metadata } from "next";
import Link from "next/link";

import { ProductFilters } from "@/components/admin/live-filters";
import { CsvImport, ProductActiveButton } from "@/components/admin/order-actions";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { ProductImage } from "@/components/catalog/product-image";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { unitLabel } from "@/lib/constants";
import { getCommerce } from "@/lib/data";
import { salePricePara } from "@/lib/data/pricing";
import { formatQuantity, formatRsd } from "@/lib/format";
import { fold } from "@/lib/text";

export const metadata: Metadata = { title: "Proizvodi" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const q = one(params.q);
  const category = one(params.category);
  const active = one(params.active) || "all";
  const [products, categories] = await Promise.all([
    getCommerce().listProducts(session.organization.id),
    getCommerce().listCategories(session.organization.id),
  ]);
  const trackStock = session.organization.trackStock === true;
  const needle = fold(q);
  const filtered = products.filter((product) => {
    if (category && product.categoryId !== category) return false;
    if (active === "active" && !product.active) return false;
    if (active === "inactive" && product.active) return false;
    if (!needle) return true;
    return [product.name, product.sku].map(fold).some((value) => value.includes(needle));
  });

  return (
    <div>
      <PageHeader
        title="Proizvodi"
        count={filtered.length}
        description="Katalog koji kupci vide na stranici za poručivanje."
        actions={
          <>
            <CsvImport />
            <Link href="/products/new">
              <Button>Dodaj proizvod</Button>
            </Link>
          </>
        }
      />
      <ProductFilters q={q} category={category} active={active} categories={categories} />
      {products.length === 0 ? (
        <EmptyState
          title="Katalog je prazan"
          body="Dodajte proizvod ručno ili ubacite CSV. Neaktivni proizvodi se ne prikazuju kupcima."
          action={
            <Link href="/products/new">
              <Button>Dodaj proizvod</Button>
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nema rezultata" body="Promenite pretragu ili filter kategorije." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Proizvod</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Jedinica</th>
                {trackStock ? <th className="px-4 py-3 font-medium">Magacin</th> : null}
                <th className="px-4 py-3 text-right font-medium">Cena</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const sale = salePricePara(product);
                return (
                <tr key={product.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductImage src={product.imageUrl} className="size-12" />
                      <div className="min-w-0">
                        <Link href={`/products/${product.id}`} className="font-medium hover:underline">
                          {product.name}
                        </Link>
                        <div className="text-muted-foreground">{product.sku || "Bez šifre"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">{unitLabel(product.unit)}</td>
                  {trackStock ? (
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatQuantity(product.stockQuantity)} {unitLabel(product.unit).toLowerCase()}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 text-right tabular-nums">
                    {sale ? (
                      <div>
                        <div>{formatRsd(sale)}</div>
                        <div className="text-xs text-muted-foreground line-through">{formatRsd(product.pricePara)}</div>
                      </div>
                    ) : (
                      formatRsd(product.pricePara)
                    )}
                  </td>
                  <td className="px-4 py-3">{product.active ? "Aktivan" : "Neaktivan"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/products/${product.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                        Izmeni
                      </Link>
                      <ProductActiveButton productId={product.id} active={product.active} />
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
