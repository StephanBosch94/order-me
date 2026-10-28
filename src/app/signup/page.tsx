import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/auth-forms";
import { getSession } from "@/lib/auth";
import { AuthShell } from "@/app/login/page";

export const metadata: Metadata = { title: "Registracija" };

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return (
    <AuthShell title="Otvorite nalog" subtitle="Naziv firme i adresa su dovoljni da stranica za poručivanje proradi.">
      <SignupForm />
      <p className="mt-6 text-sm text-muted-foreground">
        Već imate nalog?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-2 hover:underline">
          Prijavite se
        </Link>
      </p>
    </AuthShell>
  );
}
