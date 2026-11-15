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
    <span className={cn("inline-flex", className)}>
      <img
        src="/brand/vendro-logo.png"
        alt="Vendro"
        className={cn("w-auto", compact ? "h-7" : medium ? "h-8" : "h-10")}
      />
    </span>
  );
}
