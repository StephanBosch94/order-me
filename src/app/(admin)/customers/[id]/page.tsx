import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CustomerForm } from "@/components/admin/customer-form";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireSession } from "@/lib/auth";
import { documentKind, partyLabel } from "@/lib/customers";
import { getCommerce } from "@/lib/data";
import { formatDateTime, formatRsd } from "@/lib/format";

export const metadata: Metadata = { title: "Kupac" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const customer = await getCommerce().getCustomer(session.organization.id, id);
  if (!customer) notFound();

  return (
    <div>
      <Link href="/customers" className="text-sm text-muted-foreground hover:text-foreground">
        Svi kupci
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <h1 className="flex flex-wrap items-baseline gap-x-3 text-xl font-semibold tracking-tight">
          <span className="tabular-nums text-muted-foreground">{customer.code}</span>
          {customer.businessName}
        </h1>
        <Link href={`/orders/new?kupac=${customer.id}`}>
          <Button>Nova porudžbina</Button>
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {partyLabel(customer.party)}
        {customer.party === "pravna"
          ? ` · odloženo plaćanje ${customer.paymentTermDays === 0 ? "odmah" : `${customer.paymentTermDays} dana`}`
          : ""}
        {" · "}
        {customer.orderCount} porudžbina · {formatRsd(customer.totalPara)} bez otkazanih
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Podaci</h2>
          <div className="mt-4">
            <CustomerForm key={customer.updatedAt} customer={customer} />
          </div>
        </section>
        <section className="rounded-lg border border-border bg-card">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">Porudžbine</h2>
          {customer.orders.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Nema porudžbina.</p>
          ) : (
            <ul>
              {customer.orders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 text-sm last:border-0">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                        {order.number}
                      </Link>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                      {" · "}
                      <a
                        href={`/api/orders/${order.id}/pdf?vrsta=${documentKind(customer.party)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-foreground hover:underline"
                      >
                        Štampaj {documentKind(customer.party) === "faktura" ? "fakturu" : "nalog"}
                      </a>
                    </p>
                  </div>
                  <p className="tabular-nums">{formatRsd(order.totalPara)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
