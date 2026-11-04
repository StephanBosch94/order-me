"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { quantityFromInput, stepCartQuantity } from "@/lib/constants";
import type { Unit } from "@/lib/data/types";

export function QuantityInput({
  name,
  unit,
  quantity,
  onCommit,
  size = "md",
}: {
  name: string;
  unit: Unit;
  quantity: number;
  onCommit: (quantity: number) => void;
  size?: "md" | "sm";
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (quantity ? String(quantity).replace(".", ",") : "");
  const compact = size === "sm";

  function commit(raw: string) {
    const next = quantityFromInput(unit, raw);
    setDraft(null);
    if (next === null || next === quantity) return;
    onCommit(next);
  }

  function step(direction: "up" | "down") {
    const parsed = quantityFromInput(unit, shown);
    const current = parsed === null ? quantity : parsed;
    const next = stepCartQuantity(current, direction);
    setDraft(null);
    if (next !== quantity) onCommit(next);
  }

  return (
    <div className="flex items-center">
      <button
        type="button"
        className={`inline-flex cursor-pointer items-center justify-center rounded-l-md border border-border bg-card disabled:opacity-40 ${compact ? "size-9" : "size-11"}`}
        aria-label={`Smanji količinu za ${name}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => step("down")}
        disabled={quantity === 0 && !shown.trim()}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <input
        inputMode="decimal"
        aria-label={`Količina za ${name}`}
        className={`border-y border-border bg-card text-center tabular-nums outline-none ${compact ? "h-9 w-16 text-sm" : "h-11 w-20 text-sm"}`}
        value={shown}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={(event) => commit(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          commit(event.currentTarget.value);
        }}
      />
      <button
        type="button"
        className={`inline-flex cursor-pointer items-center justify-center rounded-r-md border border-border bg-card ${compact ? "size-9" : "size-11"}`}
        aria-label={`Povećaj količinu za ${name}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => step("up")}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
