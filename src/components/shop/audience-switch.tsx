import Link from "next/link";

import { businessPath, storePath } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function AudienceSwitch({ slug, mode }: { slug: string; mode: "fizicka" | "pravna" }) {
  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl gap-2 px-4 py-3 sm:px-6" role="tablist" aria-label="Kome kupujete">
        <Tab href={storePath(slug)} active={mode === "fizicka"}>
          Fizička lica
        </Tab>
        <Tab href={businessPath(slug)} active={mode === "pravna"}>
          Pravna lica
        </Tab>
      </div>
    </div>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={cn(
        "inline-flex h-9 items-center rounded-md px-3 text-sm",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-zinc-100 hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
