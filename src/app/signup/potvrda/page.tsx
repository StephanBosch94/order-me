import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/app/login/page";
import { buttonVariants } from "@/components/ui/button";
import { safeNextPath } from "@/lib/text";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Potvrdite email" };

export default async function SignupConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeNextPath(params.next) : "";
  const loginHref = next && next !== "/dashboard" ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <AuthShell title="Nalog je kreiran" subtitle="Potvrdite email adresu. Aplikacija se otvara sama.">
      <Link href={loginHref} className={cn(buttonVariants(), "w-full")}>
        Prijavite se
      </Link>
    </AuthShell>
  );
}
