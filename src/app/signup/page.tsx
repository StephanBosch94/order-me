import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/auth-forms";
import { getSession } from "@/lib/auth";
import { AuthShell } from "@/app/login/page";

export const metadata: Metadata = { title: "Registracija" };

export default async function SignupPage() {
  const session = await getSession();
  if (session?.kind === "buyer") redirect("/kupac");
  if (session) redirect("/dashboard");

  return (
    <AuthShell title="Otvorite prodavnicu" subtitle="Jedna prodavnica. Kupci vide katalog i poručuju na vašoj adresi.">
      <SignupForm mode="supplier" />
      <p className="mt-6 text-sm text-muted-foreground">
        Kupujete?{" "}
        <Link href="/signup/kupac" className="font-medium text-foreground underline-offset-2 hover:underline">
          Otvorite nalog kupca
        </Link>
      </p>
    </AuthShell>
  );
}
