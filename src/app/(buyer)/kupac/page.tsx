import type { Metadata } from "next";
import Link from "next/link";

import { PasswordForm } from "@/components/auth/password-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireBuyerSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";
import { confirmationPath, storePath } from "@/lib/constants";
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
          <p className="mt-1 text-xs text-muted-foreground">Ukupan broj porudžbina</p>
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
            {orders.map((order) => {
              const href = confirmationPath(order.supplierSlug, order.confirmationToken);
              const summary = (
                <>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <span className="underline-offset-2 group-hover:underline">{order.number}</span>
                      <StatusBadge status={order.status} />
                      <span className="font-normal text-muted-foreground">· {order.supplierName}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(order.createdAt)} · {order.itemCount} {itemWord(order.itemCount)}
                    </p>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{formatRsd(order.totalPara)}</span>
                </>
              );
              return (
                <li key={order.id} className="flex flex-col sm:flex-row sm:items-stretch">
                  {href ? (
                    <Link
                      href={href}
                      className="group flex min-w-0 flex-1 flex-col justify-center gap-2 px-4 py-4 outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
                    >
                      {summary}
                    </Link>
                  ) : (
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      {summary}
                    </div>
                  )}
                  {order.supplierSlug ? (
                    <div className="flex items-center px-4 pb-4 sm:py-4 sm:pl-0">
                      <Link href={`${storePath(order.supplierSlug)}?ponovi=${order.id}`} className="text-sm font-medium text-primary hover:underline">
                        Naruči isto
                      </Link>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10 border-t border-border pt-8">
        <PasswordForm />
      </section>
    </div>
  );
}
