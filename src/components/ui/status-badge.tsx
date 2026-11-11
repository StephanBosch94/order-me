import { statusLabel } from "@/lib/constants";
import type { OrderStatus } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const styles: Record<OrderStatus, string> = {
  nova: "bg-blue-50 text-blue-800 ring-blue-600/15",
  prihvacena: "bg-indigo-50 text-indigo-800 ring-indigo-600/15",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", styles[status])}>
      {statusLabel(status)}
    </span>
  );
}
