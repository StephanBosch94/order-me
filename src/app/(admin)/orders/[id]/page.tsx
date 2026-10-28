import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderStatusForm } from "@/components/admin/order-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireSession } from "@/lib/auth";
import { unitLabel } from "@/lib/constants";
import { getCommerce } from "@/lib/data";
import { formatDateTime, formatQuantity, formatRsd } from "@/lib/format";

export const metadata: Metadata = { title: "Porudžbina" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const order = await getCommerce().getOrder(session.organization.id, id);
  if (!order) notFound();
  const customer = order.customerSnapshot;

  return (
    <div>
      <Link href="/orders" className="text-sm text-muted-foreground hover:text-foreground">
        Sve porudžbine
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{order.number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          <a href={`/api/orders/${order.id}/pdf`} className="inline-flex h-10 items-center rounded-md border border-border bg-card px-3 text-sm font-medium">
            Preuzmi potvrdu
          </a>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="self-start overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Proizvod</th>
                <th className="px-4 py-3 font-medium">Količina</th>
                <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">Cena po jedinici</th>
                <th className="px-4 py-3 text-right font-medium">Ukupno</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-muted-foreground">{item.sku}</div>
                  </td>
                  <td className="px-4 py-3">
                    {formatQuantity(item.quantity)} {unitLabel(item.unit).toLowerCase()}
                  </td>
                  <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">{formatRsd(item.unitPricePara)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatRsd(item.lineTotalPara)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between border-t border-border px-4 py-3 text-sm">
            <span>Ukupno</span>
            <span className="font-semibold tabular-nums">{formatRsd(order.totalPara)}</span>
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Kupac</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Firma</dt>
                <dd>{customer.businessName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Kontakt</dt>
                <dd>{customer.contactName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd>{customer.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Telefon</dt>
                <dd>{customer.phone}</dd>
              </div>
              {customer.pib ? (
                <div>
                  <dt className="text-muted-foreground">PIB</dt>
                  <dd>{customer.pib}</dd>
                </div>
              ) : null}
              {customer.address || customer.city ? (
                <div>
                  <dt className="text-muted-foreground">Adresa</dt>
                  <dd>{[customer.address, customer.city].filter(Boolean).join(", ")}</dd>
                </div>
              ) : null}
            </dl>
          </section>
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Status</h2>
            <div className="mt-3">
              <OrderStatusForm orderId={order.id} status={order.status} />
            </div>
          </section>
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Napomena</h2>
            <p className="mt-2 text-sm text-muted-foreground">{order.notes || "Kupac nije ostavio napomenu."}</p>
          </section>
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Istorija statusa</h2>
            <ol className="mt-3 space-y-3">
              {order.history.map((event) => (
                <li key={event.id} className="text-sm">
                  <StatusBadge status={event.toStatus} />
                  <p className="mt-1 text-muted-foreground">
                    {formatDateTime(event.createdAt)} · {event.actorName}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
