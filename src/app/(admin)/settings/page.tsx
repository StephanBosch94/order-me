import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CopyLink } from "@/components/admin/order-actions";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { storePath } from "@/lib/constants";
import { requireSession } from "@/lib/auth";
import { isShopManager } from "@/lib/members";
import { isDemoMode, usesPostgres } from "@/lib/config";

export const metadata: Metadata = { title: "Podešavanja" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireSession();
  if (!isShopManager(session.role)) redirect("/dashboard");
  const { tab } = await searchParams;
  const path = storePath(session.organization.slug);
  return (
    <div>
      <PageHeader
        title="Podešavanja"
        description="Podaci se prikazuju kupcima i na potvrdi."
      />
      <section className="mb-6 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Adresa prodavnice</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {session.organization.publicStore === false
            ? "Javna stranica je isključena. Porudžbine i kupce unosite ovde."
            : "Pošaljite ovaj link kupcima."}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="rounded-md bg-zinc-50 px-2 py-1 text-sm">{path}</code>
          <CopyLink path={path} />
        </div>
      </section>
      <SettingsForm
        organization={{ ...session.organization, efakturaApiKey: "" }}
        hasEfakturaApiKey={session.organization.efakturaApiKey.trim().length > 0}
        initialTab={tab === "izgled" ? "izgled" : "podaci"}
      />
      {usesPostgres() ? (
        <p className="mt-8 max-w-2xl text-sm text-muted-foreground">
          Nalozi, katalog i porudžbine su u PostgreSQL bazi prodora. Server se pokreće naredbom npm run db.
        </p>
      ) : isDemoMode() ? (
        <p className="mt-8 max-w-2xl text-sm text-muted-foreground">
          Demo režim čuva nalog, katalog i porudžbine u lokalnom fajlu .data/demo-db.json. Pokrenite npm run db da ih prebacite u PostgreSQL.
        </p>
      ) : null}
    </div>
  );
}
