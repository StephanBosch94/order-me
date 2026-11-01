"use client";

import { LogOut } from "lucide-react";

export function LogoutButton({
  className,
  icon = true,
  role,
  shopPath,
}: {
  className?: string;
  icon?: boolean;
  role?: "menuitem";
  shopPath?: string;
}) {
  const target = shopPath ? `/odjava?next=${encodeURIComponent(shopPath)}` : "/odjava";
  return (
    <button
      type="button"
      role={role}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        window.location.assign(target);
      }}
    >
      {icon ? <LogOut className="size-4" aria-hidden="true" /> : null}
      Odjava
    </button>
  );
}
