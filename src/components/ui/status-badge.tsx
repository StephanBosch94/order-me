import { statusLabel } from "@/lib/constants";
import type { OrderStatus } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const styles: Record<OrderStatus, string> = {
  nova: "bg-blue-50 text-blue-800 ring-blue-600/15",
  potvrdjena: "bg-indigo-50 text-indigo-800 ring-indigo-600/15",
  u_pripremi: "bg-amber-50 text-amber-900 ring-amber-600/20",
  isporucena: "bg-emerald-50 text-emerald-800 ring-emerald-600/15",
  otkazana: "bg-zinc-100 text-zinc-600 ring-zinc-500/15",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", styles[status])}>
      {statusLabel(status)}
    </span>
  );
}
