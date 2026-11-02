"use client";

import { BarChart3, CreditCard, LifeBuoy, Menu, Store, Tags, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/auth/logout-button";
import type { PlatformAccount } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const items = [
  { href: "/platform", label: "Dobavljači", icon: Store },
  { href: "/platform/pretplate", label: "Pretplate", icon: CreditCard },
  { href: "/platform/koriscenje", label: "Korišćenje", icon: BarChart3 },
  { href: "/platform/paketi", label: "Paketi", icon: Tags },
  { href: "/platform/podrska", label: "Podrška", icon: LifeBuoy },
];

function isActive(pathname: string, href: string) {
  if (href === "/platform") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PlatformShell({
  session,
  children,
}: {
  session: PlatformAccount;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function renderNav() {
    return (
      <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Administracija">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
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
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden h-full min-h-0 flex-col border-r border-border bg-sidebar lg:flex">
          <div className="px-5 py-5">
            <Link href="/platform" className="block w-fit">
              <Logo />
            </Link>
            <p className="mt-3 text-sm font-medium">Administracija</p>
            <p className="text-xs text-muted-foreground">Platforma</p>
          </div>
          {renderNav()}
          <div className="mt-auto border-t border-border p-3">
            <p className="truncate px-2 text-sm font-medium">{session.name}</p>
            <p className="truncate px-2 text-xs text-muted-foreground">{session.email}</p>
            <LogoutButton className="mt-2 flex h-9 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm text-zinc-700 hover:bg-zinc-100" />
          </div>
        </aside>
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
            <Link href="/platform">
              <Logo compact />
            </Link>
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
              {renderNav()}
              <LogoutButton className="mt-auto flex h-11 w-full cursor-pointer items-center gap-2 rounded-md px-3 text-sm" />
            </div>
          ) : null}
          <div className={cn("min-h-0 flex-1 overflow-y-auto", open && "hidden lg:block")}>
            <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
