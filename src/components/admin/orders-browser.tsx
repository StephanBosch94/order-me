import Link from "next/link";

import { ConfirmOrderButton } from "@/components/admin/order-actions";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import { ORDER_STATUSES } from "@/lib/constants";
import type { OrderListItem, OrderStatus, Paginated } from "@/lib/data/types";
import { formatDateTime, formatRsd } from "@/lib/format";

const statuses = new Set<string>(ORDER_STATUSES.map((status) => status.value));

export type OrderListFilters = {
  q: string;
  status: OrderStatus | "all";
  from: string;
  to: string;
  sort: "newest" | "oldest" | "total_desc" | "total_asc";
  page: number;
};

export function readOrderFilters(params: Record<string, string | string[] | undefined>): OrderListFilters {
  const statusValue = one(params.status);
  const sortValue = one(params.sort);
  return {
    q: one(params.q),
    status: statuses.has(statusValue) ? (statusValue as OrderStatus) : "all",
    from: one(params.from),
    to: one(params.to),
    sort: ["newest", "oldest", "total_desc", "total_asc"].includes(sortValue)
      ? (sortValue as OrderListFilters["sort"])
      : "newest",
    page: Math.max(Number(one(params.page)) || 1, 1),
  };
}

export function OrdersBrowser({
  result,
  filters,
  basePath,
  title,
  description,
  publicPath,
  emptyTitle,
  emptyBody,
  emptyHref,
  emptyLabel,
}: {
  result: Paginated<OrderListItem>;
  filters: OrderListFilters;
  basePath: string;
  title: string;
  description: string;
  publicPath: string;
  emptyTitle: string;
  emptyBody: string;
  emptyHref?: string;
  emptyLabel?: string;
}) {
  const pages = Math.max(Math.ceil(result.total / result.pageSize), 1);
  const { q, status, from, to, sort } = filters;

  return (
    <div>
      <PageHeader title={title} description={description} />
      <form className="mb-4 grid gap-2 rounded-lg border border-border bg-card p-3 md:grid-cols-6" method="get">
        <Input name="q" defaultValue={q} placeholder="Broj ili kupac" aria-label="Pretraga porudžbina" className="md:col-span-2" />
        <Select name="status" defaultValue={status} aria-label="Status">
          <option value="all">Svi statusi</option>
          {ORDER_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Input name="from" type="date" defaultValue={from} aria-label="Datum od" />
        <Input name="to" type="date" defaultValue={to} aria-label="Datum do" />
        <Select name="sort" defaultValue={sort} aria-label="Sortiranje">
          <option value="newest">Najnovije</option>
          <option value="oldest">Najstarije</option>
          <option value="total_desc">Najveći iznos</option>
          <option value="total_asc">Najmanji iznos</option>
        </Select>
        <div className="md:col-span-6">
          <Button type="submit">Primeni</Button>
        </div>
      </form>

      {result.total === 0 ? (
        <EmptyState
          title={emptyTitle}
          body={emptyBody}
          action={
            <Link href={emptyHref ?? publicPath} target={emptyHref ? undefined : "_blank"}>
              <Button variant="secondary">{emptyLabel ?? "Pogledaj stranicu za poručivanje"}</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {result.items.map((order) => (
              <div key={order.id} className="relative rounded-lg border border-border bg-card p-4">
                <Link href={`/orders/${order.id}`} className="block after:absolute after:inset-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{order.number}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-2 text-sm">{order.businessName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                  <p className="mt-2 text-sm font-medium tabular-nums">{formatRsd(order.totalPara)}</p>
                </Link>
                {order.status === "nova" ? (
                  <div className="relative z-10 mt-3">
                    <ConfirmOrderButton orderId={order.id} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Broj</th>
                  <th className="px-4 py-3 font-medium">Kupac</th>
                  <th className="px-4 py-3 font-medium">Stavke</th>
                  <th className="px-4 py-3 text-right font-medium">Ukupno</th>
                  <th className="px-4 py-3 font-medium">Datum</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((order) => (
                  <tr key={order.id} className="relative border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/orders/${order.id}`} className="font-medium hover:underline after:absolute after:inset-0">
                          {order.number}
                        </Link>
                        <span className="relative z-10">
                          <StatusBadge status={order.status} />
                        </span>
                        {order.status === "nova" ? (
                          <span className="relative z-10">
                            <ConfirmOrderButton orderId={order.id} />
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{order.businessName}</div>
                      <div className="text-muted-foreground">{order.contactName}</div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{order.itemCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatRsd(order.totalPara)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={result.page} pages={pages} basePath={basePath} params={{ q, status, from, to, sort }} />
        </>
      )}
    </div>
  );
}

function Pagination({
  page,
  pages,
  basePath,
  params,
}: {
  page: number;
  pages: number;
  basePath: string;
  params: Record<string, string>;
}) {
  if (pages <= 1) return null;
  const href = (next: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && value !== "all" && value !== "newest") search.set(key, value);
    }
    if (next > 1) search.set("page", String(next));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <p className="text-muted-foreground">
        Strana {page} od {pages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="rounded-md border border-border bg-card px-3 py-2">
            Prethodna
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={href(page + 1)} className="rounded-md border border-border bg-card px-3 py-2">
            Sledeća
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
