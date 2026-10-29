import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/auth-forms";
import { Logo } from "@/components/brand/logo";
import { SupplierLogo } from "@/components/brand/supplier-logo";
import { getSession, landingPath } from "@/lib/auth";
import { isDemoMode } from "@/lib/config";
import { businessPath, shopMode, storePath } from "@/lib/constants";
import { getCommerce } from "@/lib/data";
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
  const store = await storeFromPath(nextPath);
  return (
    <AuthShell title="Prijava" subtitle="Prijavite se na nalog prodavca ili kupca." store={store}>
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
  const path = nextPath.split("?")[0] ?? "";
  const query = nextPath.includes("?") ? nextPath.slice(nextPath.indexOf("?")) : "";
  if (/^\/(?:s|shop)\/[^/]+$/.test(path)) return `${path}/nalog${query}`;
  return "/signup";
}

export type AuthStore = {
  name: string;
  logoUrl: string | null;
  href: string;
  caption: string;
};

export async function storeFromPath(nextPath: string): Promise<AuthStore | null> {
  const path = nextPath.split("?")[0] ?? "";
  const match = path.match(/^\/(?:shop|s)\/([^/]+)/);
  const slug = match?.[1] ? decodeURIComponent(match[1]) : "";
  if (!slug) return null;
  const catalog = await getCommerce().getPublicCatalog(slug);
  if (!catalog) return null;
  const za = new URLSearchParams(nextPath.split("?")[1] ?? "").get("za") ?? undefined;
  const business = shopMode(catalog.supplier.audience, za) === "pravna";
  return {
    name: catalog.supplier.name,
    logoUrl: catalog.supplier.logoUrl,
    href: business ? businessPath(catalog.supplier.slug) : storePath(catalog.supplier.slug),
    caption: business ? "Pravno lice" : "Fizičko lice",
  };
}

export function AuthShell({
  title,
  subtitle,
  children,
  store = null,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  store?: AuthStore | null;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12">
      <Link href={store?.href ?? "/"} className="w-fit rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
        {store ? "Nazad u prodavnicu" : "Početna"}
      </Link>
      {store ? (
        <Link href={store.href} className="mt-6 flex w-fit items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <SupplierLogo name={store.name} logoUrl={store.logoUrl} className="size-12" />
          <span className="min-w-0">
            <span className="block text-xs font-medium text-muted-foreground">{store.caption}</span>
            <span className="block truncate text-lg font-semibold tracking-tight">{store.name}</span>
          </span>
        </Link>
      ) : (
        <Link href="/" aria-label="Prodora, početna" className="mt-6 w-fit rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo />
        </Link>
      )}
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </main>
  );
}
