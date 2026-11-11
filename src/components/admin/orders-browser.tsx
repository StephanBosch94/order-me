import Link from "next/link";

import { OrderFilters } from "@/components/admin/live-filters";
import { ConfirmOrderButton, OrderRowMenu } from "@/components/admin/order-actions";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { partyLabel } from "@/lib/customers";
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
  actions,
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
  actions?: React.ReactNode;
}) {
  const pages = Math.max(Math.ceil(result.total / result.pageSize), 1);
  const { q, status, from, to, sort } = filters;

  return (
    <div>
      <PageHeader title={title} count={result.total} description={description} actions={actions} />
      <OrderFilters q={q} status={status} from={from} to={to} sort={sort} page={filters.page} />

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
              <div key={order.id} className="relative flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                <Link href={`/orders/${order.id}`} className="block min-w-0 flex-1 after:absolute after:inset-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{order.number}</span>
                    {order.status === "nova" ? <StatusBadge status={order.status} /> : null}
                  </div>
                  <p className="mt-2 text-sm">{order.businessName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{partyLabel(order.party)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                  <p className="mt-2 text-sm font-medium tabular-nums">{formatRsd(order.totalPara)}</p>
                </Link>
                <div className="relative z-10 flex shrink-0 items-center gap-1">
                  {order.status === "nova" ? <ConfirmOrderButton orderId={order.id} /> : null}
                  <OrderRowMenu orderId={order.id} />
                </div>
              </div>
            ))}
          </div>
          <div className="hidden rounded-lg border border-border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Broj</th>
                  <th className="px-4 py-3 font-medium">Kupac</th>
                  <th className="px-4 py-3 font-medium">Vrsta</th>
                  <th className="px-4 py-3 font-medium">Stavke</th>
                  <th className="px-4 py-3 text-right font-medium">Ukupno</th>
                  <th className="px-4 py-3 font-medium">Datum</th>
                  <th className="px-4 py-3 text-right font-medium">
                    <span className="sr-only">Radnje</span>
                  </th>
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
                        {order.status === "nova" ? (
                          <span className="relative z-10">
                            <StatusBadge status={order.status} />
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{order.businessName}</div>
                      <div className="text-muted-foreground">{order.contactName}</div>
                    </td>
                    <td className="px-4 py-3">{partyLabel(order.party)}</td>
                    <td className="px-4 py-3 tabular-nums">{order.itemCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatRsd(order.totalPara)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDateTime(order.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative z-10 inline-flex items-center justify-end gap-1">
                        {order.status === "nova" ? <ConfirmOrderButton orderId={order.id} /> : null}
                        <OrderRowMenu orderId={order.id} />
                      </div>
                    </td>
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
