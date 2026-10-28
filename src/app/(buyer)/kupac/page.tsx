import type { Metadata } from "next";
import Link from "next/link";

import { openSupplierAction } from "@/lib/actions/buyer";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";
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

export default async function BuyerHomePage({
  searchParams,
}: {
  searchParams: Promise<{ nedostaje?: string }>;
}) {
  const session = await requireBuyerSession();
  const orders = await getCommerce().listBuyerOrders(session.userId);
  const params = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Vaše porudžbine</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {session.name}, nalog kupca za {session.businessName}.
      </p>

      <section className="mt-8 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Poručite kod dobavljača</h2>
        <p className="mt-1 text-sm text-muted-foreground">Unesite adresu koju vam je dobavljač poslao.</p>
        <form action={openSupplierAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="flex h-10 min-w-0 flex-1 overflow-hidden rounded-md border border-input bg-card focus-within:ring-2 focus-within:ring-ring/25">
            <span className="flex items-center bg-zinc-50 px-3 text-sm text-muted-foreground">/s/</span>
            <Input
              name="slug"
              aria-label="Adresa dobavljača"
              placeholder="gastro-supply"
              className="h-full rounded-none border-0 focus-visible:ring-0"
              required
            />
          </div>
          <Button type="submit">Otvori</Button>
        </form>
        {params.nedostaje ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            Dobavljač sa tom adresom nije pronađen.
          </p>
        ) : null}
      </section>

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
                <Link
                  href={
                    order.supplierSlug
                      ? `${storePath(order.supplierChannel, order.supplierSlug)}/potvrda/${order.confirmationToken}`
                      : "/kupac"
                  }
                  className="flex flex-col gap-2 px-4 py-4 hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {order.number} · {order.supplierName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(order.createdAt)} · {order.itemCount} {itemWord(order.itemCount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} />
                    <span className="text-sm font-medium tabular-nums">{formatRsd(order.totalPara)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
