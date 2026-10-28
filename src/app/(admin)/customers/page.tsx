import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";
import { requireSession } from "@/lib/auth";
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
        description="Kupci se kreiraju kada pošalju porudžbinu. Nalog im nije potreban."
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
          body="Prvi kupac pojaviće se ovde čim neko pošalje porudžbinu sa vaše javne stranice."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Firma</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Kontakt</th>
                <th className="px-4 py-3 font-medium">Porudžbine</th>
                <th className="px-4 py-3 text-right font-medium">Vrednost</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Poslednja</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/customers/${customer.id}`} className="font-medium hover:underline">
                      {customer.businessName}
                    </Link>
                    <div className="text-muted-foreground">{customer.city}</div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <div>{customer.contactName}</div>
                    <div className="text-muted-foreground">{customer.email}</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{customer.orderCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatRsd(customer.totalPara)}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "—"}
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
