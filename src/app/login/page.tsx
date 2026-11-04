import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/auth-forms";
import { LoginPasswordForm } from "@/components/auth/password-form";
import { Logo } from "@/components/brand/logo";
import { SupplierLogo } from "@/components/brand/supplier-logo";
import { listProductionLoginChoices } from "@/lib/actions/production-login";
import { ProductionAccounts } from "@/components/auth/production-accounts";
import { getSession, landingPath } from "@/lib/auth";
import { supplierTheme } from "@/lib/color";
import { storePath } from "@/lib/constants";
import { getCommerce } from "@/lib/data";
import { isDemoShopAccount } from "@/lib/demo-shops";
import { safeNextPath } from "@/lib/text";

export const metadata: Metadata = { title: "Prijava" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; lozinka?: string }>;
}) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);
  const changingPassword = params.lozinka === "1";
  const session = await getSession();
  const demoAccount = Boolean(session && isDemoShopAccount(session.email));
  if (session && !demoAccount) redirect(await landingPath(session, nextPath));
  const store = await storeFromPath(nextPath);
  const accounts = changingPassword ? [] : await listProductionLoginChoices();
  return (
    <AuthShell
      title={changingPassword ? "Lozinka" : "Prijava"}
      subtitle={
        changingPassword
          ? "Posle čuvanja šaljemo obaveštenje na email naloga."
          : "Prijavite se na nalog prodavca ili kupca."
      }
      store={store}
      showStoreBack={false}
    >
      {changingPassword ? <LoginPasswordForm /> : <ProductionAccounts accounts={accounts} nextPath={nextPath} />}
      {changingPassword ? null : <div className="mt-6"><LoginForm nextPath={nextPath} /></div>}
      {changingPassword ? (
        <p className="mt-6 text-sm text-muted-foreground">
          <Link href={loginHref(nextPath, false)} className="font-medium text-foreground underline-offset-2 hover:underline">
            Nazad na prijavu
          </Link>
        </p>
      ) : (
        <div className="mt-6 flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>
            Nemate nalog?{" "}
            <Link href={accountHref(nextPath)} className="font-medium text-foreground underline-offset-2 hover:underline">
              Otvorite nalog
            </Link>
          </p>
          <Link href={loginHref(nextPath, true)} className="shrink-0 font-medium text-foreground underline-offset-2 hover:underline">
            Promenite lozinku
          </Link>
        </div>
      )}
    </AuthShell>
  );
}

function loginHref(nextPath: string, password: boolean) {
  const params = new URLSearchParams();
  if (nextPath) params.set("next", nextPath);
  if (password) params.set("lozinka", "1");
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
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
  brandColor: string | null;
  href: string;
};

export async function storeFromPath(nextPath: string): Promise<AuthStore | null> {
  const path = nextPath.split("?")[0] ?? "";
  const match = path.match(/^\/(?:shop|s)\/([^/]+)/);
  const slug = match?.[1] ? decodeURIComponent(match[1]) : "";
  if (!slug) return null;
  const catalog = await getCommerce().getPublicCatalog(slug);
  if (!catalog) return null;
  return {
    name: catalog.supplier.name,
    logoUrl: catalog.supplier.logoUrl,
    brandColor: catalog.supplier.brandColor,
    href: storePath(catalog.supplier.slug),
  };
}

export function AuthShell({
  title,
  subtitle,
  children,
  store = null,
  showStoreBack = true,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  store?: AuthStore | null;
  showStoreBack?: boolean;
}) {
  const backHref = store ? (showStoreBack ? store.href : null) : "/";
  const backLabel = store ? "Nazad u prodavnicu" : "Početna";
  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12"
      style={supplierTheme(store?.brandColor ?? null)}
    >
      {backHref ? (
        <Link href={backHref} className="w-fit rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          {backLabel}
        </Link>
      ) : null}
      {store ? (
        <Link href={store.href} className={`${backHref ? "mt-6" : ""} flex w-fit items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring`}>
          <SupplierLogo name={store.name} logoUrl={store.logoUrl} className="size-12" />
          <span className="truncate text-lg font-semibold tracking-tight">{store.name}</span>
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
