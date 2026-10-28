import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/auth-forms";
import { getSession } from "@/lib/auth";
import { AuthShell } from "@/app/login/page";

export const metadata: Metadata = { title: "Internet prodavnica" };

export default async function RetailSignupPage() {
  const session = await getSession();
  if (session?.kind === "buyer") redirect("/kupac");
  if (session) redirect("/dashboard");
  return (
    <AuthShell title="Internet prodavnica" subtitle="Kupci će videti proizvode, korpu i kasu. Ovo nije B2B poručivanje.">
      <SignupForm mode="b2c" />
      <p className="mt-6 text-sm text-muted-foreground">
        Treba vam poručivanje za firme?{" "}
        <Link href="/signup/firme" className="font-medium text-foreground underline-offset-2 hover:underline">
          Otvorite B2B nalog
        </Link>
      </p>
    </AuthShell>
  );
}
