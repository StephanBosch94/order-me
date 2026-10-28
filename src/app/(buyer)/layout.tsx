import Link from "next/link";

import { logoutAction } from "@/lib/actions/auth";
import { Logo } from "@/components/brand/logo";
import { requireBuyerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireBuyerSession();
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/kupac" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo />
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-medium">{session.businessName}</p>
              <p className="truncate text-xs text-muted-foreground">{session.email}</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="h-9 cursor-pointer rounded-md px-3 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                Odjava
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
