"use client";

import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { SetupGuide } from "@/components/admin/setup-guide";
import { logoutAction } from "@/lib/actions/auth";
import type { AccountContext } from "@/lib/data/types";
import type { SetupStep } from "@/lib/setup";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { SupplierLogo } from "@/components/brand/supplier-logo";

const items = [
  { href: "/dashboard", label: "Pregled", icon: LayoutDashboard },
  { href: "/orders", label: "Porudžbine", icon: ClipboardList },
  { href: "/products", label: "Proizvodi", icon: Package },
  { href: "/customers", label: "Kupci", icon: Users },
  { href: "/settings", label: "Podešavanja", icon: Settings },
];

function PoweredBy() {
  return (
    <p className="flex items-center gap-1.5 px-2 pt-3 text-xs text-muted-foreground">
      powered by
      <Link href="/" className="text-foreground">
        <Logo compact />
      </Link>
    </p>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  session,
  demo,
  setup,
  children,
}: {
  session: AccountContext;
  demo: boolean;
  setup: SetupStep[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Glavna navigacija">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={() => setOpen(false)}
            className={cn(
              "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm text-zinc-700 hover:bg-zinc-100",
              active && "bg-accent font-medium text-accent-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-dvh flex-col bg-background">
      {demo ? (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950">
          Demo režim. Podaci se čuvaju lokalno u .data i nisu produkcijska baza.
        </div>
      ) : null}
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden h-full min-h-0 flex-col border-r border-border bg-sidebar lg:flex">
          <div className="px-5 py-5">
            <div className="flex items-center gap-2.5">
              <SupplierLogo name={session.organization.name} logoUrl={session.organization.logoUrl} />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                  {session.organization.brandColor ? (
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: session.organization.brandColor }}
                    />
                  ) : null}
                  <span className="truncate">{session.organization.name}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Prodavnica
                </p>
              </div>
            </div>
          </div>
          {nav}
          <div className="mt-auto border-t border-border p-3">
            <p className="truncate px-2 text-sm font-medium">{session.name}</p>
            <p className="truncate px-2 text-xs text-muted-foreground">{session.email}</p>
            <form action={logoutAction} className="mt-2">
              <button
                type="submit"
                className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                <LogOut className="size-4" aria-hidden="true" />
                Odjava
              </button>
            </form>
            <PoweredBy />
          </div>
        </aside>
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
            <div className="flex min-w-0 items-center gap-2">
              <SupplierLogo name={session.organization.name} logoUrl={session.organization.logoUrl} className="size-8" />
              <span className="truncate text-sm font-medium">{session.organization.name}</span>
            </div>
            <button
              type="button"
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-md border border-border"
              aria-label={open ? "Zatvori meni" : "Otvori meni"}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </header>
          {open ? (
            <div className="flex min-h-0 flex-1 flex-col border-b border-border bg-card px-2 py-3 lg:hidden">
              {nav}
              <div className="mt-auto px-3 pb-1">
                <form action={logoutAction}>
                  <button type="submit" className="flex h-11 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm">
                    <LogOut className="size-4" />
                    Odjava
                  </button>
                </form>
                <PoweredBy />
              </div>
            </div>
          ) : null}
          <div className={cn("min-h-0 flex-1 overflow-y-auto", open && "hidden lg:block")}>
            <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
              <SetupGuide steps={setup} />
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
