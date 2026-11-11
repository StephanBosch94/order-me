import type { Metadata } from "next";
import Link from "next/link";

import { FollowUpBoard } from "@/components/admin/follow-up-board";
import { ConfirmOrderButton, CopyLink, OrderRowMenu } from "@/components/admin/order-actions";
import { EmptyState, Metric, PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";
import { storePath } from "@/lib/constants";
import { setupReady, storeSetup } from "@/lib/setup";
import { formatDateTime, formatLongDate, formatRsd } from "@/lib/format";

export const metadata: Metadata = { title: "Pregled" };

export default async function DashboardPage() {
  const session = await requireSession();
  const data = await getCommerce().getDashboard(session.organization.id);
  const ready = setupReady(storeSetup(session.organization, data.activeProducts));
  const publicPath = storePath(session.organization.slug);

  return (
    <div>
      <PageHeader
        title="Pregled"
        description={formatLongDate()}
        actions={
          <>
            <Link href="/orders/new">
              <Button>Dodaj porudžbinu</Button>
            </Link>
            <Link href="/customers/new">
              <Button variant="secondary">Dodaj kupca</Button>
            </Link>
          </>
        }
      />

      {ready && !data.hasOrders && session.organization.publicStore !== false ? (
        <div className="mb-6 rounded-lg border border-border bg-card px-4 py-4">
          <h2 className="text-sm font-semibold">Podelite stranicu kupcima</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pošaljite link kupcima. Porudžbine stižu ovde.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded-md bg-zinc-50 px-2 py-1 text-sm">{publicPath}</code>
            <CopyLink path={publicPath} />
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Nove porudžbine" value={String(data.newOrders)} hint="Poslednjih 7 dana" />
        <Metric label="Čekaju prihvatanje" value={String(data.awaitingConfirmation)} hint="Status Nova" />
        <Metric label="Obrađene ovog meseca" value={String(data.processedThisMonth)} hint="Prihvaćene" />
        <Metric label="Vrednost ovog meseca" value={formatRsd(data.monthValuePara)} hint="Sve porudžbine ovog meseca" />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Porudžbine koje čekaju prihvatanje</h2>
          <Link href="/orders" className="text-sm font-medium text-indigo-700 hover:underline">
            Sve porudžbine
          </Link>
        </div>
        {data.recentOrders.length === 0 ? (
          <EmptyState
            title={data.hasOrders ? "Nema porudžbina koje čekaju prihvatanje" : "Još nema porudžbina"}
            body={
              data.hasOrders
                ? "Ostale porudžbine su na listi svih porudžbina."
                : "Kada kupac pošalje prvu porudžbinu, pojaviće se u ovoj tabeli."
            }
          />
        ) : (
          <>
          <div className="space-y-3 sm:hidden">
            {data.recentOrders.map((order) => (
              <div key={order.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                    {order.number}
                  </Link>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-2 text-sm">{order.businessName}</p>
                <p className="mt-1 text-sm font-medium tabular-nums">{formatRsd(order.totalPara)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                <div className="mt-3 flex items-center gap-1">
                  {order.status === "nova" ? <ConfirmOrderButton orderId={order.id} /> : null}
                  <OrderRowMenu orderId={order.id} />
                </div>
              </div>
            ))}
          </div>
          <div className="hidden rounded-lg border border-border bg-card sm:block">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Broj</th>
                  <th className="px-4 py-3 font-medium">Kupac</th>
                  <th className="px-4 py-3 text-right font-medium">Ukupno</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Datum</th>
                  <th className="px-4 py-3 text-right font-medium">
                    <span className="sr-only">Potvrda</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                          {order.number}
                        </Link>
                        <StatusBadge status={order.status} />
                      </div>
                    </td>
                    <td className="px-4 py-3">{order.businessName}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatRsd(order.totalPara)}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{formatDateTime(order.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        {order.status === "nova" ? <ConfirmOrderButton orderId={order.id} /> : null}
                        <OrderRowMenu orderId={order.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>

      <FollowUpBoard items={data.followUps} />
    </div>
  );
}
