import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/auth-forms";
import { getSession, landingPath } from "@/lib/auth";
import { isDemoShopAccount } from "@/lib/demo-shops";
import { AuthShell } from "@/app/login/page";

export const metadata: Metadata = { title: "Nalog kupca" };

export default async function BuyerSignupPage() {
  const session = await getSession();
  if (session && !isDemoShopAccount(session.email)) {
    if (session.kind === "buyer") redirect(await landingPath(session, ""));
    redirect("/dashboard");
  }
  return (
    <AuthShell title="Nalog kupca" subtitle="Firma vidi svoje porudžbine, statistiku i može da naruči isto kao prošli put.">
      <SignupForm mode="buyer" />
      <p className="mt-6 text-sm text-muted-foreground">
        Prodajete?{" "}
        <Link href="/signup" className="font-medium text-foreground underline-offset-2 hover:underline">
          Otvorite distribuciju
        </Link>
      </p>
    </AuthShell>
  );
}
