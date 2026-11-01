import type { Metadata } from "next";

import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { invoiceStatusLabel } from "@/components/platform/copy";
import { requireSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";
import { belgradeMonthKey, formatDate, formatRsd, monthLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Fakture od Prodore" };

export default async function InvoicesPage() {
  const session = await requireSession();
  const invoices = await getCommerce().listInvoices(session.organization.id);

  return (
    <div>
      <PageHeader
        title="Fakture od Prodore"
        description="Fakture koje Prodora izdaje dobavljaču za korišćenje platforme. Ovo nisu potvrde porudžbina kupaca."
      />
      {invoices.length === 0 ? (
        <EmptyState
          title="Još nema faktura"
          body="Kada Prodora izda fakturu za korišćenje platforme, pojaviće se ovde."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Broj</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 text-right font-medium">Iznos</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Datum</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{invoice.number}</td>
                  <td className="px-4 py-3">{monthLabel(belgradeMonthKey(invoice.periodStart))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatRsd(invoice.amountPara)}</td>
                  <td className="px-4 py-3">{invoiceStatusLabel(invoice.status)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(invoice.issuedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
