"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { isCompanyBuyer } from "@/lib/buyer";
import type { BuyerAccount } from "@/lib/data/types";

export function BuyerMenu({
  buyer,
  name,
  onAccount,
  accountHref,
  onOrders,
  ordersHref,
  shopPath,
}: {
  buyer?: BuyerAccount;
  name?: string;
  onAccount?: () => void;
  accountHref?: string;
  onOrders?: () => void;
  ordersHref?: string;
  shopPath?: string;
}) {
  const router = useRouter();
  const company = buyer ? isCompanyBuyer(buyer) : false;
  const label = name ?? (company && buyer ? buyer.businessName : buyer?.name) ?? "";
  const initials = buyerInitials(label);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const itemClass = "flex w-full cursor-pointer px-3 py-2.5 text-left text-sm font-medium hover:bg-zinc-50";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {initials}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
        >
          {onOrders ? (
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                close();
                onOrders();
              }}
            >
              Porudžbine
            </button>
          ) : ordersHref ? (
            <button type="button" role="menuitem" className={itemClass} onClick={() => go(ordersHref)}>
              Porudžbine
            </button>
          ) : null}
          {onAccount ? (
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                close();
                onAccount();
              }}
            >
              Moj nalog
            </button>
          ) : accountHref ? (
            <button type="button" role="menuitem" className={itemClass} onClick={() => go(accountHref)}>
              Moj nalog
            </button>
          ) : null}
          <LogoutButton
            icon={false}
            role="menuitem"
            shopPath={shopPath}
            className="flex w-full cursor-pointer border-t border-border px-3 py-2.5 text-left text-sm font-medium hover:bg-zinc-50"
          />
        </div>
      ) : null}
    </div>
  );
}

function buyerInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters =
    words.length === 1 ? [...words[0]].slice(0, 2) : [words[0]?.[0] ?? "", words[1]?.[0] ?? ""];
  return letters.join("").toLocaleUpperCase("sr-Latn");
}
