"use client";

import Link from "next/link";

import { StoreAccountLinks } from "@/components/shop/account-links";
import { confirmationPath } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { BuyerAccount, BuyerOrder } from "@/lib/data/types";
import { formatDateTime, formatRsd } from "@/lib/format";

export function BusinessAccount({
  slug,
  buyer,
  orders,
  onRepeat,
  showAccount = true,
}: {
  slug: string;
  buyer: BuyerAccount | null;
  orders: BuyerOrder[];
  onRepeat: (items: BuyerOrder["items"]) => void;
  showAccount?: boolean;
}) {
  if (!buyer && !showAccount) return null;
  if (!buyer) {
    return (
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Nalog kupca</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sa nalogom vidite svoje porudžbine i možete da naručite isto kao prošli put.
        </p>
        <div className="mt-3">
          <StoreAccountLinks slug={slug} showAccount={showAccount} />
        </div>
      </section>
    );
  }

  const active = orders;
  const spent = active.reduce((sum, order) => sum + order.totalPara, 0);
  const last = orders[0];
  const repeat = active[0] ?? last;

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Vaše porudžbine</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {buyer.businessName || buyer.name}
          </p>
        </div>
        {repeat ? (
          <Button type="button" size="sm" onClick={() => onRepeat(repeat.items)}>
            Naruči isto kao prošli put
          </Button>
        ) : null}
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Porudžbine" value={String(active.length)} />
        <Stat label="Ukupno" value={formatRsd(spent)} />
        <Stat label="Poslednja" value={last ? formatDateTime(last.createdAt) : "Nema"} />
      </dl>
      {orders.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Još nema porudžbina kod ove prodavnice.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border border-t border-border">
          {orders.map((order) => {
            const href = confirmationPath(order.supplierSlug || slug, order.confirmationToken);
            const summary = (
              <>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium underline-offset-2 group-hover:underline">{order.number}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
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
                    className="group flex min-w-0 flex-1 flex-col justify-center gap-1 py-3 outline-none hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pr-3"
                  >
                    {summary}
                  </Link>
                ) : (
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pr-3">
                    {summary}
                  </div>
                )}
                <div className="flex items-center pb-3 sm:py-3">
                  <button
                    type="button"
                    className="text-sm font-medium text-primary hover:underline"
                    onClick={() => onRepeat(order.items)}
                  >
                    Ponovi
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function itemWord(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "stavka";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "stavke";
  return "stavki";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-50 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
