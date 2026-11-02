import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/auth-forms";
import { getSession, landingPath } from "@/lib/auth";
import { isDemoShopAccount } from "@/lib/demo-shops";
import { AuthShell } from "@/app/login/page";

export const metadata: Metadata = { title: "Registracija" };

export default async function SignupPage() {
  const session = await getSession();
  if (session && !isDemoShopAccount(session.email)) {
    if (session.kind === "buyer") redirect(await landingPath(session, ""));
    redirect("/dashboard");
  }

  return (
    <AuthShell title="Otvorite distribuciju" subtitle="Kupci firme same unose količine. Porudžbine stižu na vašu adresu.">
      <SignupForm mode="supplier" />
      <p className="mt-6 text-sm text-muted-foreground">
        Već imate nalog?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-2 hover:underline">
          Prijavite se
        </Link>
      </p>
    </AuthShell>
  );
}
