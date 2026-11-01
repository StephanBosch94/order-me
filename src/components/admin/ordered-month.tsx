"use client";

import { useState } from "react";

import { ProductImage } from "@/components/catalog/product-image";
import { unitLabel } from "@/lib/constants";
import type { OrderedQuantity } from "@/lib/data/types";
import { formatQuantity, monthLabel } from "@/lib/format";
import { purchaseMonths, purchasesForMonth } from "@/lib/purchases";

export function OrderedMonth({ lines }: { lines: OrderedQuantity[] }) {
  const months = purchaseMonths(lines);
  const [month, setMonth] = useState(months[0] ?? "");
  const ordered = purchasesForMonth(lines, month);

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Naručeno</h2>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Mesec
          <select
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="h-9 rounded-md border border-border bg-card px-2 text-sm text-foreground"
          >
            {months.map((key) => (
              <option key={key} value={key}>
                {monthLabel(key)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {ordered.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">U ovom mesecu nema porudžbina.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {ordered.map((line) => (
            <li key={line.key} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
              <ProductImage src={line.imageUrl} alt="" className="size-14" />
              <p className="min-w-0 text-sm font-medium">
                <span className="tabular-nums">{formatQuantity(line.quantity)}</span> {line.name}
                {line.unit === "komad" ? null : (
                  <span className="font-normal text-muted-foreground"> · {unitLabel(line.unit)}</span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
