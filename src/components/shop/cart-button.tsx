"use client";

import { ShoppingBag } from "lucide-react";

export function CartButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Korpa, ${count}`}
      className="relative inline-flex size-10 cursor-pointer items-center justify-center rounded-md text-foreground outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ShoppingBag className="size-5" strokeWidth={1.75} aria-hidden="true" />
      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-md bg-zinc-950 px-1 text-[11px] font-semibold tabular-nums leading-none text-white">
        {count}
      </span>
    </button>
  );
}
