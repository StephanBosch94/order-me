import type { Metadata } from "next";
import Link from "next/link";

import { NewCustomerForm } from "@/components/admin/new-customer-form";
import { PageHeader } from "@/components/admin/page-header";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Novi kupac" };

export default async function NewCustomerPage() {
  await requireSession();

  return (
    <div>
      <Link href="/customers" className="text-sm text-muted-foreground hover:text-foreground">
        Svi kupci
      </Link>
      <div className="mt-3">
        <PageHeader
          title="Novi kupac"
          description="Kupac dobija šifru odmah. Porudžbinu možete da unesete čim sačuvate podatke."
        />
      </div>
      <NewCustomerForm />
    </div>
  );
}
