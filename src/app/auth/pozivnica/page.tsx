import type { Metadata } from "next";

import { AuthShell } from "@/app/login/page";
import { StaffInviteForm } from "@/components/auth/staff-invite-form";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Napravite lozinku", ...noIndex };

export default async function StaffInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; type?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";
  const type = params.type === "recovery" ? "recovery" : "invite";

  return (
    <AuthShell
      title="Napravite lozinku"
      subtitle="Pozivnica je za pristup prodavnici. Lozinku birate sami."
    >
      {token ? (
        <StaffInviteForm token={token} type={type} />
      ) : (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Pozivnica nije potpuna. Otvorite link iz emaila.
        </p>
      )}
    </AuthShell>
  );
}
