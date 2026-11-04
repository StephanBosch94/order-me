import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/auth-forms";
import { ProductionAccounts } from "@/components/auth/production-accounts";
import { listProductionLoginChoices } from "@/lib/actions/production-login";
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
  const accounts = await listProductionLoginChoices();
  return (
      <AuthShell title="Nalog kupca" subtitle="Kupac bira da li je fizičko ili pravno lice, vidi svoje porudžbine i može da naruči isto kao prošli put.">
      <ProductionAccounts accounts={accounts} />
      <div className="mt-6">
        <SignupForm mode="buyer" />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Prodajete?{" "}
        <Link href="/signup" className="font-medium text-foreground underline-offset-2 hover:underline">
          Otvorite veleprodaju
        </Link>
      </p>
    </AuthShell>
  );
}
