import { Package } from "lucide-react";

import { cn } from "@/lib/utils";

export function ProductImage({
  src,
  alt = "",
  className,
}: {
  src: string | null;
  alt?: string;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn("size-16 shrink-0 rounded-md border border-border bg-white object-cover", className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-16 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-zinc-50 text-zinc-400",
        className,
      )}
    >
      <Package className="size-5" />
    </span>
  );
}
