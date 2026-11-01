import type { Metadata } from "next";

import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { subscriptionStatusLabel } from "@/components/platform/copy";
import { SubscriptionForm } from "@/components/platform/forms";
import { getCommerce } from "@/lib/data";
import { formatDate, formatRsd } from "@/lib/format";

export const metadata: Metadata = { title: "Pretplate" };

export default async function PlatformSubscriptionsPage() {
  const [suppliers, plans] = await Promise.all([
    getCommerce().listPlatformSuppliers(),
    getCommerce().listPlans(),
  ]);
  const planOptions = plans.map((plan) => ({ id: plan.id, name: plan.name }));

  return (
    <div>
      <PageHeader title="Pretplate" description="Paket, status i početak tekućeg perioda za svakog dobavljača." />
      {plans.length === 0 ? (
        <EmptyState title="Nema paketa" body="Prvo sačuvajte pakete i cene, pa dodelite pretplatu." />
      ) : (
        <div className="space-y-3">
          {suppliers.map((row) => (
            <section key={row.organization.id} className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold">{row.organization.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {row.subscription
                    ? `${subscriptionStatusLabel(row.subscription.status)} · od ${formatDate(row.subscription.periodStart)}`
                    : "Nema pretplate"}
                  {row.plan ? ` · ${row.plan.name} · ${formatRsd(row.plan.monthlyPricePara)}` : ""}
                </p>
              </div>
              <SubscriptionForm
                organizationId={row.organization.id}
                planId={row.subscription?.planId || plans[0]?.id || ""}
                status={row.subscription?.status ?? "aktivna"}
                plans={planOptions}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
