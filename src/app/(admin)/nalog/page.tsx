import type { Metadata } from "next";

import { PasswordForm } from "@/components/auth/password-form";
import { PageHeader } from "@/components/admin/page-header";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Moj nalog" };

export default async function AccountPage() {
  const session = await requireSession();
  return (
    <div>
      <PageHeader title="Moj nalog" description="Podaci za prijavu na ovu prodavnicu." />
      <dl className="mb-8 max-w-xl space-y-3 text-sm">
        <div>
          <dt className="font-medium">Ime</dt>
          <dd className="mt-1">{session.name}</dd>
        </div>
        <div>
          <dt className="font-medium">Email</dt>
          <dd className="mt-1">{session.email}</dd>
        </div>
      </dl>
      <PasswordForm />
    </div>
  );
}
