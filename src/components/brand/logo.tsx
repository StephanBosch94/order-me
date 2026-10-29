import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold tracking-tight",
        compact ? "gap-1.5 text-xs font-medium" : "gap-2",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center bg-[#635bff] text-white",
          compact ? "size-4 rounded text-[9px]" : "size-7 rounded-md text-xs",
        )}
      >
        P
      </span>
      Prodora
    </span>
  );
}
