import type { Metadata } from "next";
import Link from "next/link";

import { CopyLink } from "@/components/admin/order-actions";
import { EmptyState, Metric, PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";
import { businessPath, sellsToBusinesses, sellsToConsumers, storePath } from "@/lib/constants";
import { setupReady, storeSetup } from "@/lib/setup";
import { formatDateTime, formatLongDate, formatRsd } from "@/lib/format";

export const metadata: Metadata = { title: "Pregled" };

export default async function DashboardPage() {
  const session = await requireSession();
  const data = await getCommerce().getDashboard(session.organization.id);
  const audience = session.organization.audience;
  const ready = setupReady(storeSetup(session.organization, data.activeProducts));
  const publicPath = sellsToBusinesses(audience) && !sellsToConsumers(audience)
    ? businessPath(session.organization.slug)
    : storePath(session.organization.slug);

  return (
    <div>
      <PageHeader
        title="Pregled"
        description={formatLongDate()}
        actions={
          <>
            <Link href="/products/new">
              <Button>Dodaj proizvod</Button>
            </Link>
            <Link href={publicPath} target="_blank">
              <Button variant="secondary">Pogledajte prodavnicu</Button>
            </Link>
          </>
        }
      />

      {ready && !data.hasOrders ? (
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
        <Metric label="Čekaju potvrdu" value={String(data.awaitingConfirmation)} hint="Status Nova" />
        <Metric label="Obrađene ovog meseca" value={String(data.processedThisMonth)} hint="Potvrđene, u pripremi ili isporučene" />
        <Metric label="Vrednost ovog meseca" value={formatRsd(data.monthValuePara)} hint="Bez otkazanih porudžbina" />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Skorašnje porudžbine</h2>
          <Link href="/orders" className="text-sm text-indigo-700 hover:underline">
            Sve porudžbine
          </Link>
        </div>
        {data.recentOrders.length === 0 ? (
          <EmptyState title="Još nema porudžbina" body="Kada kupac pošalje prvu porudžbinu, pojaviće se u ovoj tabeli." />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Broj</th>
                  <th className="px-4 py-3 font-medium">Kupac</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Ukupno</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Datum</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                        {order.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{order.businessName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatRsd(order.totalPara)}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{formatDateTime(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8 flex items-center justify-between rounded-lg border border-border bg-card px-4 py-4">
        <div>
          <h2 className="text-sm font-semibold">Proizvodi</h2>
          <p className="mt-1 text-sm text-muted-foreground">{data.activeProducts} aktivnih proizvoda u katalogu.</p>
        </div>
        <Link href="/products" className="text-sm font-medium text-indigo-700 hover:underline">
          Upravljajte proizvodima
        </Link>
      </section>
    </div>
  );
}
