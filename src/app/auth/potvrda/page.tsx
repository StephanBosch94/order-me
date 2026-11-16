import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/app/login/page";
import { OpenConfirmedAccount } from "@/components/auth/open-confirmed-account";
import { safeNextPath } from "@/lib/text";

export const metadata: Metadata = { title: "Otvaramo nalog" };

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; next?: string }>;
}) {
  const params = await searchParams;
  const tokenHash = params.token_hash?.trim() ?? "";
  if (!tokenHash) redirect("/login");
  const next = typeof params.next === "string" ? safeNextPath(params.next) : "";

  return (
    <AuthShell title="Otvaramo nalog" subtitle="Email je potvrđen.">
      <OpenConfirmedAccount tokenHash={tokenHash} nextPath={next !== "/dashboard" ? next : ""} />
    </AuthShell>
  );
}
