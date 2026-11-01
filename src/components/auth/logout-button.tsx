"use client";

import { LogOut } from "lucide-react";

import { logoutAction } from "@/lib/actions/auth";

export function LogoutButton({
  className,
  icon = true,
  role,
}: {
  className?: string;
  icon?: boolean;
  role?: "menuitem";
}) {
  return (
    <button type="button" role={role} className={className} onClick={() => void logoutAction()}>
      {icon ? <LogOut className="size-4" aria-hidden="true" /> : null}
      Odjava
    </button>
  );
}
