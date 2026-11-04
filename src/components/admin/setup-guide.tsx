import { Check, X } from "lucide-react";
import Link from "next/link";

import type { SetupStep } from "@/lib/setup";
import { setupReady } from "@/lib/setup";
import { cn } from "@/lib/utils";

export function SetupGuide({ steps, onClose }: { steps: SetupStep[]; onClose: () => void }) {
  if (setupReady(steps)) return null;
  const done = steps.filter((step) => step.done).length;

  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-labelledby="setup-guide">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="setup-guide" className="text-sm font-semibold">
            Pokrenite prodavnicu
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Vodič stoji ovde dok ne završite sve korake. Štiklira se čim sačuvate podatak.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <p className="text-sm font-medium tabular-nums">
            {done} od {steps.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zatvorite vodič"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-zinc-100 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-3">
        {steps.map((step) => (
          <li key={step.id}>
            <Link href={step.href} className="flex items-start gap-3 rounded-md px-1 py-2 hover:bg-zinc-50">
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                  step.done ? "bg-primary text-primary-foreground" : "border border-border bg-card",
                )}
                aria-hidden="true"
              >
                {step.done ? <Check className="size-3" /> : null}
              </span>
              <span className="min-w-0">
                <span className="sr-only">{step.done ? "Završeno. " : "Preostalo. "}</span>
                <span className={cn("block text-sm font-medium", step.done && "text-muted-foreground")}>{step.title}</span>
                <span className="block text-sm text-muted-foreground">{step.detail}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
