"use client";

import { useTransition } from "react";

import { switchDemoRoleAction } from "@/lib/actions/demo-role";
import type { DemoRole } from "@/lib/demo-shops";
import { cn } from "@/lib/utils";

export function DemoRoleSwitch({ slug, active }: { slug: string; active: DemoRole | null }) {
  const [pending, start] = useTransition();

  function choose(role: DemoRole) {
    start(() => {
      void switchDemoRoleAction(slug, role);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Demo</span>
      <div className="flex rounded-md border border-border p-0.5" role="tablist" aria-label="Uloga u demo prodavnici">
        <RoleButton active={active === "kupac"} disabled={pending} onClick={() => choose("kupac")}>
          Kupac
        </RoleButton>
        <RoleButton active={active === "prodavac"} disabled={pending} onClick={() => choose("prodavac")}>
          Prodavac
        </RoleButton>
      </div>
    </div>
  );
}

function RoleButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 cursor-pointer items-center rounded px-3 text-sm",
        active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-zinc-100",
      )}
    >
      {children}
    </button>
  );
}
