"use client";

import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { toast } from "sonner";

import { importProductsAction, setProductActiveAction } from "@/lib/actions/catalog";
import { sendEfakturaAction } from "@/lib/actions/efaktura";
import { updateOrderStatusAction } from "@/lib/actions/orders";
import { ORDER_STATUSES, statusLabel } from "@/lib/constants";
import type { OrderStatus } from "@/lib/data/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/ui/file-dropzone";

export function OrderStatusMenu({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const currentIndex = Math.max(
    0,
    ORDER_STATUSES.findIndex((item) => item.value === status),
  );

  useEffect(() => {
    if (!open) return;
    itemRefs.current[currentIndex]?.focus();

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, currentIndex]);

  function closeMenu(focusButton = false) {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  }

  function choose(next: OrderStatus) {
    closeMenu(true);
    if (next === status || pending) return;
    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, next);
      if (!result.ok) {
        toast.error(result.message ?? "Status nije sačuvan.");
        return;
      }
      toast.success(result.message ?? "Status porudžbine je ažuriran.");
      router.refresh();
    });
  }

  function onMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const items = itemRefs.current.filter((item): item is HTMLButtonElement => item !== null);
    const index = items.findIndex((item) => item === document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <Button
        ref={buttonRef}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Status porudžbine: ${statusLabel(status)}`}
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {pending ? "Čuvanje…" : statusLabel(status)}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </Button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Statusi porudžbine"
          className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-md border border-border bg-card py-1 shadow-lg"
          onKeyDown={onMenuKeyDown}
        >
          {ORDER_STATUSES.map((item, index) => {
            const current = item.value === status;
            return (
              <button
                key={item.value}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={current}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none",
                  current && "font-medium",
                )}
                onClick={() => choose(item.value)}
              >
                {item.label}
                {current ? <Check className="size-4 shrink-0" aria-hidden /> : <span className="size-4 shrink-0" aria-hidden />}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function SendEfakturaButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMessage("");
            const result = await sendEfakturaAction(orderId);
            setMessage(result.ok ? "" : result.message);
            if (!result.ok) {
              toast.error(result.message);
              return;
            }
            toast.success(result.message);
            router.refresh();
          })
        }
      >
        {pending ? "Slanje…" : "Pošalji e-fakturu"}
      </Button>
      {message ? (
        <p role="alert" className="max-w-xs text-sm text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function ConfirmOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        startTransition(async () => {
          const result = await updateOrderStatusAction(orderId, "potvrdjena");
          if (!result.ok) {
            toast.error(result.message ?? "Porudžbina nije potvrđena.");
            return;
          }
          toast.success("Porudžbina je potvrđena.");
          router.refresh();
        });
      }}
    >
      {pending ? "Potvrda…" : "Potvrdi"}
    </Button>
  );
}

export function ProductActiveButton({ productId, active }: { productId: string; active: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setProductActiveAction(productId, !active);
          if (!result.ok) {
            toast.error(result.error ?? "Promena nije sačuvana.");
            return;
          }
          toast.success(active ? "Proizvod je deaktiviran." : "Proizvod je aktiviran.");
          router.refresh();
        })
      }
    >
      {active ? "Deaktiviraj" : "Aktiviraj"}
    </Button>
  );
}

export function CsvImport() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setMessage("");
          setOpen(true);
        }}
      >
        Ubaci CSV
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="csv-import-title"
            className="w-full max-w-lg rounded-xl border border-border bg-card p-5 text-foreground shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="csv-import-title" className="text-base font-semibold">
              Uvoz proizvoda
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Kolone: naziv, sku, kategorija, jedinica, cena, opis, min_kolicina, aktivan. Separator može biti zarez ili tačka-zarez. Jedinice: komad, paket, kutija, kilogram, litar.
            </p>
            <a href="/sablon-proizvoda.csv" download className="mt-3 inline-block text-sm font-medium text-indigo-700 underline-offset-2 hover:underline">
              Preuzmite šablon
            </a>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const file = (event.currentTarget.elements.namedItem("file") as HTMLInputElement).files?.[0];
                if (!file) {
                  setMessage("Izaberite CSV fajl.");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  startTransition(async () => {
                    const result = await importProductsAction(String(reader.result ?? ""));
                    setMessage(result.message ?? result.error ?? "");
                    if (result.ok) {
                      toast.success(result.message ?? "Uvoz je završen.");
                      setOpen(false);
                      router.refresh();
                    }
                  });
                };
                reader.readAsText(file);
              }}
            >
              <FileDropzone
                id="csv-file"
                name="file"
                accept=".csv,text/csv"
                heading="Prevucite CSV ovde"
                releaseHeading="Pustite da dodate CSV"
                hint="CSV fajl. Separator može biti zarez ili tačka-zarez."
                typeError="Izaberite CSV fajl."
              />
              {message ? <p className="text-sm">{message}</p> : null}
              <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                  {pending ? "Uvoz…" : "Ubaci"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Zatvori
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function CopyLink({ path }: { path: string }) {
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        const url = `${window.location.origin}${path}`;
        await navigator.clipboard.writeText(url);
        toast.success("Link je kopiran.");
      }}
    >
      Kopiraj link
    </Button>
  );
}
