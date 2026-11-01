import type { Metadata } from "next";

import { OrdersBrowser, readOrderFilters } from "@/components/admin/orders-browser";
import { requireSession } from "@/lib/auth";
import { sellsToBusinesses } from "@/lib/constants";
import { getCommerce } from "@/lib/data";

export const metadata: Metadata = { title: "Porudžbine" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const filters = readOrderFilters(await searchParams);
  const separateCompanyOrders = sellsToBusinesses(session.organization.audience);
  const result = await getCommerce().listOrders(session.organization.id, {
    ...filters,
    pageSize: 10,
    ...(separateCompanyOrders ? { company: false } : {}),
  });

  return (
    <OrdersBrowser
      result={result}
      filters={filters}
      basePath="/orders"
      title="Porudžbine"
      description={
        separateCompanyOrders
          ? "Porudžbine kupaca koji nisu firme. Porudžbine firmi su na posebnoj strani."
          : "Pretražite, filtrirajte i otvorite porudžbine kupaca."
      }
      publicPath={`/s/${session.organization.slug}`}
      emptyTitle="Nema porudžbina za izabrane filtere"
      emptyBody={
        separateCompanyOrders
          ? "Porudžbine firmi su na posebnoj strani. Ovde ostaju ostale porudžbine."
          : "Promenite pretragu ili sačekajte da kupac pošalje porudžbinu sa vaše javne stranice."
      }
      emptyHref={separateCompanyOrders ? "/orders/firme" : undefined}
      emptyLabel={separateCompanyOrders ? "Porudžbine firmi" : undefined}
    />
  );
}
