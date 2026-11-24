import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/auth-forms";
import { getSession } from "@/lib/auth";
import { isDemoShopAccount } from "@/lib/demo-shops";
import { AuthShell } from "@/app/login/page";
import { signupMetadata } from "@/lib/seo";

export const metadata: Metadata = signupMetadata(
  "Otvorite veleprodaju",
  "Otvorite veleprodaju na Vendro. Kupci sami unose količine, a porudžbine stižu na vašu adresu. Prva 3 meseca besplatno.",
  "/signup",
);

export default async function SignupPage() {
  const session = await getSession();
  if (session && !isDemoShopAccount(session.email) && session.kind !== "buyer") {
    redirect("/dashboard");
  }

  return (
    <AuthShell title="Otvorite veleprodaju" subtitle="3 meseca besplatno. Kupci firme same unose količine. Porudžbine stižu na vašu adresu.">
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
