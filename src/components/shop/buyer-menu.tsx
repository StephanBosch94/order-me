"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { isCompanyBuyer } from "@/lib/buyer";
import { statusLabel } from "@/lib/constants";
import type { BuyerAccount, BuyerOrder } from "@/lib/data/types";
import { formatRsd } from "@/lib/format";

export function BuyerMenu({
  buyer,
  orders = [],
  onAccount,
  accountHref,
  onRepeat,
  repeatBase,
}: {
  buyer: BuyerAccount;
  orders?: BuyerOrder[];
  onAccount?: () => void;
  accountHref?: string;
  onRepeat?: (items: BuyerOrder["items"]) => void;
  repeatBase?: string;
}) {
  const company = isCompanyBuyer(buyer);
  const label = company ? buyer.businessName : buyer.name;
  const initials = buyerInitials(label);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

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
          className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
        >
          {company ? null : (
            <div className="max-h-64 overflow-y-auto border-b border-border">
              {orders.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">Još nema porudžbina.</p>
              ) : (
                <ul>
                  {orders.map((order) => (
                    <li key={order.id} className="border-b border-border px-3 py-2.5 last:border-b-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{order.number}</p>
                          <p className="text-xs text-muted-foreground">{statusLabel(order.status)}</p>
                        </div>
                        <p className="shrink-0 text-sm font-medium tabular-nums">{formatRsd(order.totalPara)}</p>
                      </div>
                      {onRepeat ? (
                        <button
                          type="button"
                          className="mt-1 cursor-pointer text-sm font-medium text-primary hover:underline"
                          onClick={() => {
                            close();
                            onRepeat(order.items);
                          }}
                        >
                          Naruči isto
                        </button>
                      ) : repeatBase ? (
                        <Link
                          href={`${repeatBase}?ponovi=${order.id}`}
                          className="mt-1 inline-block text-sm font-medium text-primary hover:underline"
                          onClick={close}
                        >
                          Naruči isto
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {onAccount ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full cursor-pointer px-3 py-2.5 text-left text-sm font-medium hover:bg-zinc-50"
              onClick={() => {
                close();
                onAccount();
              }}
            >
              Moj nalog
            </button>
          ) : accountHref ? (
            <Link
              href={accountHref}
              role="menuitem"
              className="flex w-full px-3 py-2.5 text-sm font-medium hover:bg-zinc-50"
              onClick={close}
            >
              Moj nalog
            </Link>
          ) : null}
          <LogoutButton
            icon={false}
            role="menuitem"
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
