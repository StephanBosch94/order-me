import type { Metadata } from "next";
import Link from "next/link";

import { CustomerCsvImport } from "@/components/admin/order-actions";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";
import { requireSession } from "@/lib/auth";
import { partyLabel } from "@/lib/customers";
import { getCommerce } from "@/lib/data";
import { formatDate, formatRsd } from "@/lib/format";

export const metadata: Metadata = { title: "Kupci" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession();
  const { q = "" } = await searchParams;
  const customers = await getCommerce().listCustomers(session.organization.id, q);

  return (
    <div>
      <PageHeader
        title="Kupci"
        count={customers.length}
        description="Dodajte kupca ili sačekajte da se pojavi kada pošalje porudžbinu."
        actions={
          <>
            <CustomerCsvImport />
            <Link href="/customers/new">
              <Button>Novi kupac</Button>
            </Link>
          </>
        }
      />
      <form className="mb-4 flex gap-2" method="get">
        <Input name="q" defaultValue={q} placeholder="Pretraži kupce" aria-label="Pretraži kupce" className="max-w-sm" />
        <Button type="submit" variant="secondary">
          Pretraži
        </Button>
      </form>
      {customers.length === 0 ? (
        <EmptyState
          title={q ? "Nema kupaca za ovu pretragu" : "Još nema kupaca"}
          body="Dodajte kupca ručno, ubacite CSV ili sačekajte prvu porudžbinu sa javne stranice."
          action={
            q ? undefined : (
              <Link href="/customers/new">
                <Button>Novi kupac</Button>
              </Link>
            )
          }
        />
      ) : (
        <>
        <ul className="space-y-3 sm:hidden">
          {customers.map((customer) => (
            <li key={customer.id} className="rounded-lg border border-border bg-card p-4">
              <Link href={`/customers/${customer.id}`} className="font-medium hover:underline">
                {customer.businessName}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {customer.code}
                {" · "}
                {partyLabel(customer.party)}
                {customer.party === "pravna"
                  ? customer.sefRegistered
                    ? " · u sistemu e-faktura"
                    : " · nije u sistemu e-faktura"
                  : ""}
                {customer.city ? ` · ${customer.city}` : ""}
              </p>
              <p className="mt-2 text-sm">
                <span className="tabular-nums">{customer.orderCount}</span>
                <span className="text-muted-foreground"> porudžbina · </span>
                <span className="font-medium tabular-nums">{formatRsd(customer.totalPara)}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "Još nema porudžbine"}
              </p>
              <Link href={`/customers/${customer.id}`} className={`${buttonVariants({ variant: "secondary", size: "sm" })} mt-3`}>
                Izmeni
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto rounded-lg border border-border bg-card sm:block">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Šifra</th>
                <th className="px-4 py-3 font-medium">Firma</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Kontakt</th>
                <th className="px-4 py-3 font-medium">Porudžbine</th>
                <th className="px-4 py-3 text-right font-medium">Vrednost</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Poslednja</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Radnje</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="whitespace-nowrap font-medium tabular-nums underline decoration-zinc-300 underline-offset-2 hover:decoration-foreground"
                    >
                      {customer.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/customers/${customer.id}`} className="font-medium hover:underline">
                      {customer.businessName}
                    </Link>
                    <div className="text-muted-foreground">
                      {partyLabel(customer.party)}
                      {customer.party === "pravna"
                        ? customer.sefRegistered
                          ? " · u sistemu e-faktura"
                          : " · nije u sistemu e-faktura"
                        : ""}
                      {customer.city ? ` · ${customer.city}` : ""}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <div>{customer.contactName}</div>
                    <div className="text-muted-foreground">{customer.email}</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{customer.orderCount}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatRsd(customer.totalPara)}</td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground sm:table-cell">
                    {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/customers/${customer.id}`}
                      className={buttonVariants({ variant: "secondary", size: "sm" })}
                    >
                      Izmeni
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
