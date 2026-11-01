"use client";

import { LogOut } from "lucide-react";

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
    <button
      type="button"
      role={role}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        window.location.assign("/odjava");
      }}
    >
      {icon ? <LogOut className="size-4" aria-hidden="true" /> : null}
      Odjava
    </button>
  );
}
