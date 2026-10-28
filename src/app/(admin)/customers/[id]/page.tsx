import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CustomerForm } from "@/components/admin/customer-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireSession } from "@/lib/auth";
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
      <h1 className="mt-3 text-xl font-semibold tracking-tight">{customer.businessName}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {customer.orderCount} porudžbina · {formatRsd(customer.totalPara)} bez otkazanih
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Podaci</h2>
          <div className="mt-4">
            <CustomerForm customer={customer} />
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
                    <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                      {order.number}
                    </Link>
                    <p className="text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={order.status} />
                    <p className="mt-1 tabular-nums">{formatRsd(order.totalPara)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
