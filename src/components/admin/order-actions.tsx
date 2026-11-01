"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { importProductsAction, setProductActiveAction } from "@/lib/actions/catalog";
import { updateOrderStatusAction } from "@/lib/actions/orders";
import { ORDER_STATUSES } from "@/lib/constants";
import type { OrderStatus } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Select } from "@/components/ui/fields";

export function OrderStatusForm({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    if (value === "otkazana" && status !== "otkazana" && !confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, value);
      setConfirming(false);
      if (!result.ok) {
        toast.error(result.message ?? "Status nije sačuvan.");
        return;
      }
      toast.success(result.message ?? "Status porudžbine je ažuriran.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <Select value={value} onChange={(event) => setValue(event.target.value as OrderStatus)} aria-label="Status porudžbine">
        {ORDER_STATUSES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>
      {confirming ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Otkazati porudžbinu? Promena se beleži u istoriji statusa.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {status === "nova" ? (
          <Button
            disabled={pending}
            onClick={() => {
              setValue("potvrdjena");
              startTransition(async () => {
                const result = await updateOrderStatusAction(orderId, "potvrdjena");
                setConfirming(false);
                if (!result.ok) {
                  toast.error(result.message ?? "Porudžbina nije potvrđena.");
                  return;
                }
                toast.success("Porudžbina je potvrđena.");
                router.refresh();
              });
            }}
          >
            {pending ? "Potvrda…" : "Potvrdi porudžbinu"}
          </Button>
        ) : null}
        <Button onClick={save} disabled={pending || value === status} variant={status === "nova" ? "secondary" : "default"}>
          {pending ? "Čuvanje…" : confirming ? "Potvrdi otkazivanje" : "Sačuvaj status"}
        </Button>
        {confirming ? (
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            Otkaži
          </Button>
        ) : null}
      </div>
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
        Uvezi CSV
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
                  {pending ? "Uvoz…" : "Uvezi"}
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
