import type { Metadata } from "next";

import { CopyLink } from "@/components/admin/order-actions";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireSession } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";

export const metadata: Metadata = { title: "Podešavanja" };

export default async function SettingsPage() {
  const session = await requireSession();
  const path = `/s/${session.organization.slug}`;
  return (
    <div>
      <PageHeader title="Podešavanja" description="Podaci firme se prikazuju kupcima i na potvrdi porudžbine." />
      <section className="mb-6 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Stranica za poručivanje</h2>
        <p className="mt-1 text-sm text-muted-foreground">Pošaljite ovaj link postojećim kupcima.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="rounded-md bg-zinc-50 px-2 py-1 text-sm">{path}</code>
          <CopyLink path={path} />
        </div>
      </section>
      <SettingsForm organization={session.organization} />
      {isDemoMode() ? (
        <p className="mt-8 max-w-2xl text-sm text-muted-foreground">
          Demo režim čuva nalog, katalog i porudžbine u lokalnom fajlu .data/demo-db.json. Za produkciju podesite Supabase promenljive iz .env.example i pokrenite supabase/schema.sql.
        </p>
      ) : null}
    </div>
  );
}
