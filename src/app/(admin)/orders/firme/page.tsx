import type { Metadata } from "next";

import { OrdersBrowser, readOrderFilters } from "@/components/admin/orders-browser";
import { requireSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";

export const metadata: Metadata = { title: "Porudžbine firmi" };

export default async function CompanyOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const filters = readOrderFilters(await searchParams);
  const result = await getCommerce().listOrders(session.organization.id, {
    ...filters,
    pageSize: 10,
    company: true,
  });

  return (
    <OrdersBrowser
      result={result}
      filters={filters}
      basePath="/orders/firme"
      title="Porudžbine firmi"
      description="Porudžbine kupaca sa PIB-om firme i one plaćene na račun."
      publicPath={`/s/${session.organization.slug}`}
      emptyTitle="Nema porudžbina firmi za izabrane filtere"
      emptyBody="Ovde stižu porudžbine kupaca koji naručuju kao firma, uključujući plaćanje na račun."
    />
  );
}
