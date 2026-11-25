import { statusLabel } from "@/lib/constants";
import type { OrderStatus } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const tones: Record<OrderStatus, { chip: string; dot: string }> = {
  nova: { chip: "bg-mint-soft text-foreground", dot: "bg-mint" },
  prihvacena: { chip: "bg-navy text-white", dot: "bg-mint" },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const tone = tones[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", tone.chip)}>
      <span className={cn("size-1.5 rounded-full", tone.dot)} aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}
