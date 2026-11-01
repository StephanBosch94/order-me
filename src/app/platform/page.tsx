import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { supplierAudienceLabel } from "@/components/platform/copy";
import { ActiveToggle } from "@/components/platform/forms";
import { storePath } from "@/lib/constants";
import { getCommerce } from "@/lib/data";

export const metadata: Metadata = { title: "Dobavljači" };

export default async function PlatformSuppliersPage() {
  const suppliers = await getCommerce().listPlatformSuppliers();

  return (
    <div>
      <PageHeader
        title="Dobavljači"
        description="Pregled naloga, grada i toga kome je prodavnica namenjena. Deaktiviran nalog ne prima nove porudžbine."
      />
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Naziv</th>
              <th className="px-4 py-3 font-medium">Adresa</th>
              <th className="px-4 py-3 font-medium">Grad</th>
              <th className="px-4 py-3 font-medium">Kupci</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Prodavnica</th>
              <th className="px-4 py-3 font-medium">Nalog</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((row) => (
              <tr key={row.organization.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{row.organization.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.organization.slug}</td>
                <td className="px-4 py-3">{row.organization.city || "—"}</td>
                <td className="px-4 py-3">{supplierAudienceLabel(row.organization.audience)}</td>
                <td className="px-4 py-3">{row.organization.active ? "Aktivan" : "Neaktivan"}</td>
                <td className="px-4 py-3">
                  <Link href={storePath(row.organization.slug)} className="text-indigo-700 hover:underline" target="_blank">
                    Otvori
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <ActiveToggle
                    organizationId={row.organization.id}
                    slug={row.organization.slug}
                    active={row.organization.active}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
