import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/page-header";
import { NoteForm } from "@/components/platform/forms";
import { getCommerce } from "@/lib/data";

export const metadata: Metadata = { title: "Podrška" };

export default async function PlatformSupportPage() {
  const suppliers = await getCommerce().listPlatformSuppliers();

  return (
    <div>
      <PageHeader
        title="Podrška"
        description="Kontakt dobavljača i interna beleška. Beleška se ne prikazuje u prodavnici."
      />
      <div className="space-y-3">
        {suppliers.map((row) => (
          <section key={row.organization.id} className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">{row.organization.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {row.organization.email || "Nema emaila"}
              {row.organization.phone ? ` · ${row.organization.phone}` : ""}
            </p>
            <div className="mt-3">
              <NoteForm organizationId={row.organization.id} note={row.note} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
