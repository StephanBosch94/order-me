import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/auth-forms";
import { getSession } from "@/lib/auth";
import { AuthShell } from "@/app/login/page";

export const metadata: Metadata = { title: "Nalog kupca" };

export default async function BuyerSignupPage() {
  const session = await getSession();
  if (session?.kind === "buyer") redirect("/kupac");
  if (session) redirect("/dashboard");
  return (
    <AuthShell title="Nalog kupca" subtitle="Za firme koje poručuju od dobavljača. Internet prodavnica ima svoju kasu, bez ovog naloga.">
      <SignupForm mode="buyer" />
      <p className="mt-6 text-sm text-muted-foreground">
        Prodajete?{" "}
        <Link href="/signup" className="font-medium text-foreground underline-offset-2 hover:underline">
          Izaberite prodavnicu ili B2B
        </Link>
      </p>
    </AuthShell>
  );
}
