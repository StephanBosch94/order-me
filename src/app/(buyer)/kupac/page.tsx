import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { requireBuyerSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";
import { storePath } from "@/lib/constants";
import { formatDateTime, formatRsd } from "@/lib/format";

export const metadata: Metadata = { title: "Kupac" };

function itemWord(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "stavka";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "stavke";
  return "stavki";
}

export default async function BuyerHomePage() {
  const session = await requireBuyerSession();
  const orders = await getCommerce().listBuyerOrders(session.userId);
  const active = orders.filter((order) => order.status !== "otkazana");
  const spent = active.reduce((sum, order) => sum + order.totalPara, 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Vaše porudžbine</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {session.businessName && session.businessName !== session.name
          ? `${session.name}, ${session.businessName}.`
          : session.name}
      </p>

      <dl className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <dt className="text-xs text-muted-foreground">Porudžbine</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{active.length}</dd>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <dt className="text-xs text-muted-foreground">Ukupno</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{formatRsd(spent)}</dd>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <dt className="text-xs text-muted-foreground">Poslednja</dt>
          <dd className="mt-1 text-lg font-semibold">{orders[0] ? formatDateTime(orders[0].createdAt) : "Nema"}</dd>
        </div>
      </dl>

      <section className="mt-8">
        {orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card px-4 py-10 text-center">
            <p className="text-sm font-medium">Još nema porudžbina</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Otvorite stranicu dobavljača i pošaljite prvu porudžbinu. Pojaviće se ovde.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {orders.map((order) => (
              <li key={order.id}>
                <div className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    href={order.supplierSlug ? `/s/${order.supplierSlug}/potvrda/${order.confirmationToken}` : "/kupac"}
                    className="min-w-0 flex-1"
                  >
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <span>{order.number}</span>
                      <StatusBadge status={order.status} />
                      <span className="font-normal text-muted-foreground">· {order.supplierName}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(order.createdAt)} · {order.itemCount} {itemWord(order.itemCount)}
                    </p>
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium tabular-nums">{formatRsd(order.totalPara)}</span>
                    {order.supplierSlug ? (
                      <Link href={`${storePath(order.supplierSlug)}?ponovi=${order.id}`} className="text-sm font-medium text-primary hover:underline">
                        Naruči isto
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
