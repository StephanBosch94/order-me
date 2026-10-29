import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/auth-forms";
import { Logo } from "@/components/brand/logo";
import { getSession, landingPath } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import { safeNextPath } from "@/lib/text";

export const metadata: Metadata = { title: "Prijava" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);
  const session = await getSession();
  if (session) redirect(landingPath(session, nextPath));
  return (
    <AuthShell title="Prijava" subtitle="Prijavite se na nalog prodavca ili kupca.">
      <LoginForm nextPath={nextPath} demo={isDemoMode()} />
      <p className="mt-6 text-sm text-muted-foreground">
        Nemate nalog?{" "}
        <Link href={accountHref(nextPath)} className="font-medium text-foreground underline-offset-2 hover:underline">
          Otvorite nalog
        </Link>
      </p>
    </AuthShell>
  );
}

function accountHref(nextPath: string) {
  if (/^\/(?:s|shop)\/[^/]+$/.test(nextPath)) return `${nextPath}/nalog`;
  return "/signup";
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="w-fit rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
        Početna
      </Link>
      <Link href="/" aria-label="Prodora, početna" className="mt-6 w-fit rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Logo />
      </Link>
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </main>
  );
}
