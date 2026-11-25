"use client";

import {
  ClipboardList,
  LayoutDashboard,
  Menu,
  Package,
  Receipt,
  Settings,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { SetupGuide } from "@/components/admin/setup-guide";
import { BuyerMenu } from "@/components/shop/buyer-menu";
import { StoreHeader } from "@/components/shop/store-header";
import { isShopManager } from "@/lib/members";
import { storePath } from "@/lib/constants";
import type { AccountContext } from "@/lib/data/types";
import { SETUP_GUIDE_COOKIE, setupReady, withSetupGuideClosed, type SetupStep } from "@/lib/setup";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";

const items: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { href: "/dashboard", label: "Pregled", icon: LayoutDashboard },
  { href: "/orders", label: "Porudžbine", icon: ClipboardList },
  { href: "/customers", label: "Kupci", icon: Users },
  { href: "/products", label: "Proizvodi", icon: Package },
  { href: "/zaposleni", label: "Zaposleni", icon: UserPlus },
  { href: "/settings", label: "Podešavanja", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  session,
  demoShop = null,
  setup,
  guideClosed = false,
  children,
}: {
  session: AccountContext;
  demoShop?: string | null;
  setup: SetupStep[];
  guideClosed?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [closed, setClosed] = useState(guideClosed);
  const shopPath = storePath(session.organization.slug);
  const showGuide = !setupReady(setup) && !closed;

  function closeGuide() {
    const current = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${SETUP_GUIDE_COOKIE}=`))
      ?.slice(SETUP_GUIDE_COOKIE.length + 1);
    const next = withSetupGuideClosed(current, session.organization.id);
    document.cookie = `${SETUP_GUIDE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    setClosed(true);
  }

  useEffect(() => {
    queueMicrotask(() => setOpen(false));
  }, [pathname]);

  function renderNav() {
    return (
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pt-3" aria-label="Glavna navigacija">
        {items
          .filter((item) => isShopManager(session.role) || item.href !== "/settings")
          .map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-sm text-foreground hover:bg-muted",
                active && "bg-accent font-medium text-accent-foreground",
              )}
            >
              <Icon className={cn("size-4", active && "text-navy")} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  function renderFooter() {
    const active = isActive(pathname, "/invoices");
    return (
      <div className="mt-auto shrink-0 px-3 pb-3">
        <hr className="mx-2.5 border-0 border-t border-border" />
        <Link href="/dashboard" className="mt-3 flex px-2.5 text-foreground">
          <Logo medium />
        </Link>
        {isShopManager(session.role) ? (
          <Link
            href="/invoices"
            aria-current={active ? "page" : undefined}
            className={cn(
              "mt-1 flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-sm text-foreground hover:bg-muted",
              active && "bg-accent font-medium text-accent-foreground",
            )}
          >
            <Receipt className={cn("size-4", active && "text-navy")} aria-hidden="true" />
            Fakture
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <StoreHeader
        href="/dashboard"
        name={session.organization.name}
        logoUrl={session.organization.logoUrl}
        alignMenu
        role={demoShop ? { slug: demoShop, active: "prodavac" } : null}
      >
        <button
          type="button"
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-md border border-border lg:hidden"
          aria-label={open ? "Zatvori meni" : "Otvori meni"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <BuyerMenu
          name={session.support ? "Podrška" : session.name}
          ordersHref="/orders"
          accountHref={session.support ? undefined : "/nalog"}
          shopPath={shopPath}
          allowLogout={!demoShop && !session.support}
        />
      </StoreHeader>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden h-full min-h-0 flex-col border-r border-border bg-sidebar lg:flex">
          {renderNav()}
          {renderFooter()}
        </aside>
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          {open ? (
            <div className="flex min-h-0 flex-1 flex-col border-b border-border bg-card px-2 py-3 lg:hidden">
              {renderNav()}
              {renderFooter()}
            </div>
          ) : null}
          <div className={cn("flex min-h-0 flex-1", open && "hidden lg:flex")}>
            <div className="min-w-0 flex-1 overflow-y-auto">
              <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                {session.support ? (
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm">
                    <p>
                      Pristup podrške za <span className="font-medium">{session.support.organizationName}</span>. Lozinka
                      klijenta ostaje njegova. Pristup važi 2 sata i možete ga ponovo otvoriti.
                    </p>
                    <a href="/podrska/izlaz" className="font-medium underline-offset-2 hover:underline">
                      Završite pristup
                    </a>
                  </div>
                ) : null}
                {session.organization.active ? null : (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    Nalog je deaktiviran. Prodavnica ne prima nove porudžbine. Pregled, fakture i podešavanja ostaju dostupni.
                  </div>
                )}
                {children}
                {showGuide ? (
                  <div className="mt-6 lg:hidden">
                    <SetupGuide steps={setup} onClose={closeGuide} />
                  </div>
                ) : null}
              </main>
            </div>
            {showGuide ? (
              <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border p-4 lg:block xl:w-96">
                <div className="sticky top-0">
                  <SetupGuide steps={setup} onClose={closeGuide} />
                </div>
              </aside>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
