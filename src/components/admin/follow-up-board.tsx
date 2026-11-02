"use client";

import { Info } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { EmptyState } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import type { SalesFollowUp } from "@/lib/data/types";
import { followUpReason } from "@/lib/follow-ups";
import { formatDate, formatRsd } from "@/lib/format";

const MEANING =
  "Ritam je uobičajeni razmak između porudžbina. Ovde su samo kupci koji su taj ritam prešli, oni sa jednom starom porudžbinom i oni koji još nisu naručili.";

export function FollowUpBoard({ items }: { items: SalesFollowUp[] }) {
  const visible = items.slice(0, 3);

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold">Kupci za poziv</h2>
          <InfoTip text={MEANING} />
        </div>
        <Link href="/customers" className="text-sm font-medium text-indigo-700 hover:underline">
          Svi kupci
        </Link>
      </div>
      {visible.length === 0 ? (
        <EmptyState
          title="Svi kupci su u ritmu"
          body="Kada neko preskoči uobičajeni razmak, pojaviće se ovde sa telefonom, emailom i datumom poslednje porudžbine."
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-3">
          {visible.map((item) => (
            <li key={item.customerId} className="flex flex-col rounded-lg border border-border bg-card px-4 py-4">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <Link href={`/customers/${item.customerId}`} className="font-medium hover:underline">
                  {item.businessName}
                </Link>
                <span className="tabular-nums text-muted-foreground">({item.code})</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {followUpReason(item)}
                {item.averagePara > 0 ? ` Prosečno ${formatRsd(item.averagePara)}.` : ""}
              </p>
              <p className="mt-2 text-sm">
                {item.phone ? (
                  <a href={`tel:${item.phone.replace(/\s/g, "")}`} className="hover:underline">
                    {item.phone}
                  </a>
                ) : (
                  "Nema telefon"
                )}
              </p>
              <p className="mt-1 text-sm">
                {item.email ? (
                  <a href={`mailto:${item.email}`} className="hover:underline">
                    {item.email}
                  </a>
                ) : (
                  "Nema email"
                )}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.lastOrderAt ? `Poslednja porudžbina ${formatDate(item.lastOrderAt)}` : "Nema poslednje porudžbine."}
              </p>
              <Link href={`/orders/new?kupac=${item.customerId}`} className="mt-4">
                <Button size="sm" variant="secondary" className="w-full">
                  Nova porudžbina
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-zinc-100 hover:text-foreground"
        aria-label="Šta znači Kupci za poziv"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Info className="size-4" aria-hidden="true" />
      </button>
      {open ? (
        <p
          id={panelId}
          role="note"
          className="absolute left-0 top-8 z-20 w-72 rounded-md border border-border bg-card p-3 text-sm font-normal text-muted-foreground shadow-md"
        >
          {text}
        </p>
      ) : null}
    </div>
  );
}
