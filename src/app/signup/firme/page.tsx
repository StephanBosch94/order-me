import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/auth-forms";
import { getSession } from "@/lib/auth";
import { AuthShell } from "@/app/login/page";

export const metadata: Metadata = { title: "Poručivanje za firme" };

export default async function WholesaleSignupPage() {
  const session = await getSession();
  if (session?.kind === "buyer") redirect("/kupac");
  if (session) redirect("/dashboard");
  return (
    <AuthShell title="Poručivanje za firme" subtitle="Stranica na kojoj poslovni kupci naručuju količine sa cenovnika.">
      <SignupForm mode="b2b" />
      <p className="mt-6 text-sm text-muted-foreground">
        Kupujete kao firma?{" "}
        <Link href="/signup/kupac" className="font-medium text-foreground underline-offset-2 hover:underline">
          Otvorite nalog kupca
        </Link>
      </p>
    </AuthShell>
  );
}
