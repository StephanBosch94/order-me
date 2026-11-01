import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/page-header";
import { getCommerce } from "@/lib/data";
import { currentBelgradeMonthKey, formatRsd, monthLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Korišćenje" };

export default async function PlatformUsagePage() {
  const suppliers = await getCommerce().listPlatformSuppliers();
  const month = monthLabel(currentBelgradeMonthKey());
  const totals = suppliers.reduce(
    (sum, row) => ({
      productCount: sum.productCount + row.productCount,
      ordersThisMonth: sum.ordersThisMonth + row.ordersThisMonth,
      monthValuePara: sum.monthValuePara + row.monthValuePara,
    }),
    { productCount: 0, ordersThisMonth: 0, monthValuePara: 0 },
  );

  return (
    <div>
      <PageHeader
        title="Korišćenje"
        description={`${month}. Vrednost porudžbina ne uračunava otkazane.`}
      />
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Dobavljač</th>
              <th className="px-4 py-3 text-right font-medium">Proizvodi</th>
              <th className="px-4 py-3 text-right font-medium">Porudžbine ovog meseca</th>
              <th className="px-4 py-3 text-right font-medium">Vrednost ovog meseca</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((row) => (
              <tr key={row.organization.id} className="border-b border-border">
                <td className="px-4 py-3 font-medium">{row.organization.name}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.productCount}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.ordersThisMonth}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatRsd(row.monthValuePara)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-zinc-50 font-medium">
              <td className="px-4 py-3">Ukupno · {suppliers.length} dobavljača</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.productCount}</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.ordersThisMonth}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatRsd(totals.monthValuePara)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
