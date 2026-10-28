import type { Metadata } from "next";
import Link from "next/link";

import { CsvImport, ProductActiveButton } from "@/components/admin/order-actions";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { ProductImage } from "@/components/catalog/product-image";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import { requireSession } from "@/lib/auth";
import { unitLabel } from "@/lib/constants";
import { getCommerce } from "@/lib/data";
import { formatRsd } from "@/lib/format";
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
      <form className="mb-4 grid gap-2 md:grid-cols-4" method="get">
        <Input name="q" defaultValue={q} placeholder="Pretraži proizvode" aria-label="Pretraži proizvode" className="md:col-span-2" />
        <Select name="category" defaultValue={category} aria-label="Kategorija">
          <option value="">Sve kategorije</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
        <Select name="active" defaultValue={active} aria-label="Status proizvoda">
          <option value="all">Svi</option>
          <option value="active">Aktivni</option>
          <option value="inactive">Neaktivni</option>
        </Select>
        <div className="md:col-span-4">
          <Button type="submit" variant="secondary">
            Primeni
          </Button>
        </div>
      </form>
      {products.length === 0 ? (
        <EmptyState
          title="Katalog je prazan"
          body="Dodajte proizvod ručno ili uvezite CSV. Neaktivni proizvodi se ne prikazuju kupcima."
          action={
            <Link href="/products/new">
              <Button>Dodaj proizvod</Button>
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nema rezultata" body="Promenite pretragu ili filter kategorije." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Proizvod</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Jedinica</th>
                <th className="px-4 py-3 text-right font-medium">Cena</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
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
                  <td className="px-4 py-3 text-right tabular-nums">{formatRsd(product.pricePara)}</td>
                  <td className="px-4 py-3">{product.active ? "Aktivan" : "Neaktivan"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/products/${product.id}`} className="inline-flex h-8 items-center rounded-md border border-border px-2.5 text-[13px]">
                        Izmeni
                      </Link>
                      <ProductActiveButton productId={product.id} active={product.active} />
                    </div>
                  </td>
                </tr>
              ))}
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
