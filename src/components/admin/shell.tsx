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

import { audienceLabel } from "@/lib/constants";
import { logoutAction } from "@/lib/actions/auth";
import type { AccountContext } from "@/lib/data/types";
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

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  session,
  demo,
  children,
}: {
  session: AccountContext;
  demo: boolean;
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
    <div className="min-h-dvh bg-background">
      {demo ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950">
          Demo režim. Podaci se čuvaju lokalno u .data i nisu produkcijska baza.
        </div>
      ) : null}
      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-sidebar lg:flex">
          <div className="px-5 py-5">
            <Logo />
            <div className="mt-4 flex items-center gap-2.5">
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
                  Prodavnica · {audienceLabel(session.organization.audience).toLowerCase()}
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
          </div>
        </aside>
        <div className="min-w-0">
          <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
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
            <div className="border-b border-border bg-card px-2 py-3 lg:hidden">
              {nav}
              <form action={logoutAction} className="px-3 pt-2">
                <button type="submit" className="flex h-11 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm">
                  <LogOut className="size-4" />
                  Odjava
                </button>
              </form>
            </div>
          ) : null}
          <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
