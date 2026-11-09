"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

import { SupplierLogo } from "@/components/brand/supplier-logo";
import { DemoRoleSwitch } from "@/components/shop/demo-role-switch";
import { supplierTheme } from "@/lib/color";
import type { DemoRole } from "@/lib/demo-shops";
import { cn } from "@/lib/utils";

export function StoreHeader({
  href,
  name,
  logoUrl,
  heading = false,
  onNavigate,
  role,
  brandColor,
  alignMenu = false,
  children,
}: {
  href: string;
  name: string;
  logoUrl: string | null;
  heading?: boolean;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>) => void;
  role?: { slug: string; active: DemoRole | null } | null;
  brandColor?: string | null;
  alignMenu?: boolean;
  children?: ReactNode;
}) {
  const title = heading ? (
    <h1 className="min-w-0 truncate text-xl font-semibold tracking-tight">{name}</h1>
  ) : (
    <span className="min-w-0 truncate text-xl font-semibold tracking-tight">{name}</span>
  );

  return (
    <header
      className="sticky top-0 z-30 shrink-0 border-b border-border bg-card"
      style={brandColor ? supplierTheme(brandColor) : undefined}
    >
      <div
        className={cn(
          "flex w-full flex-wrap items-center gap-x-3 gap-y-3 py-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4",
          alignMenu ? "px-5.5" : "mx-auto max-w-6xl px-4 sm:px-6",
        )}
      >
        <Link
          href={href}
          onClick={onNavigate}
          className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-none sm:justify-self-start"
        >
          <SupplierLogo name={name} logoUrl={logoUrl} className="size-12" />
          {title}
        </Link>
        <div
          className={cn(
            role
              ? "order-last flex w-full justify-center sm:order-none sm:w-auto sm:justify-self-center"
              : "hidden sm:block",
          )}
        >
          {role ? <DemoRoleSwitch slug={role.slug} active={role.active} /> : null}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-3 sm:justify-self-end">{children}</div>
      </div>
    </header>
  );
}
