import type { Metadata } from "next";

import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { PlanForm } from "@/components/platform/forms";
import { getCommerce } from "@/lib/data";
import { formatPriceInput, formatRsd } from "@/lib/format";

export const metadata: Metadata = { title: "Paketi i cene" };

export default async function PlatformPlansPage() {
  const plans = await getCommerce().listPlans();

  return (
    <div>
      <PageHeader title="Paketi i cene" description="Mesečna cena pretplate, u dinarima." />
      {plans.length === 0 ? (
        <EmptyState title="Nema paketa" body="Paketi se dodaju pri pripremi platforme." />
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <section key={plan.id} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{plan.description}</p>
              <p className="mt-1 text-sm font-medium tabular-nums">{formatRsd(plan.monthlyPricePara)} mesečno</p>
              <div className="mt-3">
                <PlanForm plan={plan} price={formatPriceInput(plan.monthlyPricePara)} />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
