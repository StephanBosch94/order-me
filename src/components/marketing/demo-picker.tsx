"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { distributionDemoLabel, showDistributionDemo, showOnlineStore } from "@/lib/marketing";

const choices = [
  {
    href: "/shop/mercis-atelier",
    label: "Online prodavnica",
    title: "Nakit",
    shop: "Mercis Atelier",
    online: true,
  },
  {
    href: "/shop/mesara-pajic",
    label: "Veleprodaja",
    title: "Mesara",
    shop: "Mesara Pajić",
    online: false,
  },
];

export function DemoPicker({ className }: { className?: string }) {
  const visible = choices.filter((choice) => (choice.online ? showOnlineStore : showDistributionDemo));
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  if (visible.length === 0) return null;

  if (visible.length === 1) {
    const choice = visible[0];
    return (
      <Link href={choice.href} target="_blank" rel="noreferrer" className={className}>
        {distributionDemoLabel}
        <span className="sr-only">, otvara se u novom tabu</span>
      </Link>
    );
  }

  return (
    <>
      <button ref={triggerRef} type="button" className={className} onClick={() => setOpen(true)}>
        {distributionDemoLabel}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/45 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="w-full max-w-lg rounded-[16px] border border-border bg-white p-6 text-navy outline-none"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id={titleId} className="text-2xl font-semibold tracking-[-0.03em]">
                Mesara ili nakit?
              </h2>
              <button
                type="button"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-mint-soft hover:text-navy"
                onClick={() => setOpen(false)}
              >
                <span className="sr-only">Zatvorite</span>
                <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {visible.map((choice) => (
                <Link
                  key={choice.href}
                  href={choice.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[16px] border border-border px-4 py-4 transition-colors hover:border-navy hover:bg-mint-soft"
                >
                  <span className="block text-xs font-medium text-muted-foreground">{choice.label}</span>
                  <span className="mt-2 block text-lg font-semibold tracking-tight">{choice.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{choice.shop}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
