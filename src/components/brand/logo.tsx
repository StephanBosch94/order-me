import { cn } from "@/lib/utils";

export function Logo({
  className,
  compact = false,
  medium = false,
}: {
  className?: string;
  compact?: boolean;
  medium?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold tracking-tight",
        medium ? "gap-1.5 text-sm" : compact ? "gap-1.5 text-xs font-medium" : "gap-2",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center bg-[#635bff] text-white",
          medium ? "size-6 rounded-md text-[11px]" : compact ? "size-4 rounded text-[9px]" : "size-7 rounded-md text-xs",
        )}
      >
        P
      </span>
      Prodora
    </span>
  );
}
