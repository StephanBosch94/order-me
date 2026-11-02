import type { Metadata } from "next";

import Link from "next/link";

import { OrdersBrowser, readOrderFilters } from "@/components/admin/orders-browser";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { sellsToBusinesses, sellsToConsumers } from "@/lib/constants";
import { getCommerce } from "@/lib/data";

export const metadata: Metadata = { title: "Porudžbine" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const filters = readOrderFilters(await searchParams);
  const audience = session.organization.audience;
  const showBuyerKind = sellsToBusinesses(audience) && sellsToConsumers(audience);
  const result = await getCommerce().listOrders(session.organization.id, {
    ...filters,
    pageSize: 10,
  });

  return (
    <OrdersBrowser
      result={result}
      filters={filters}
      basePath="/orders"
      title="Porudžbine"
      description="Pretražite, filtrirajte i otvorite porudžbine kupaca."
      actions={
        <Link href="/orders/new">
          <Button>Nova porudžbina</Button>
        </Link>
      }
      publicPath={`/s/${session.organization.slug}`}
      emptyTitle="Nema porudžbina za izabrane filtere"
      emptyBody="Promenite pretragu ili sačekajte da kupac pošalje porudžbinu sa vaše javne stranice."
      showBuyerKind={showBuyerKind}
    />
  );
}
