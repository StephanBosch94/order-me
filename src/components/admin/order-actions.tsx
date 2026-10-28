"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { importProductsAction, setProductActiveAction } from "@/lib/actions/catalog";
import { updateOrderStatusAction } from "@/lib/actions/orders";
import { ORDER_STATUSES } from "@/lib/constants";
import type { OrderStatus } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
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
      <div className="flex gap-2">
        <Button onClick={save} disabled={pending || value === status}>
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

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Uvezi CSV
      </Button>
      {open ? (
        <dialog open className="w-[min(100%,32rem)] rounded-xl border border-border bg-card p-5 text-foreground">
          <h2 className="text-base font-semibold">Uvoz proizvoda</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Kolone: naziv, sku, kategorija, jedinica, cena, opis, min_kolicina, aktivan. Separator može biti zarez ili tačka-zarez.
          </p>
          <a href="/primer-proizvoda.csv" className="mt-2 inline-block text-sm text-indigo-700 underline">
            Preuzmite primer
          </a>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const file = (event.currentTarget.elements.namedItem("file") as HTMLInputElement).files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                startTransition(async () => {
                  const result = await importProductsAction(String(reader.result ?? ""));
                  setMessage(result.message ?? result.error ?? "");
                  if (result.ok) {
                    toast.success(result.message ?? "Uvoz je završen.");
                    router.refresh();
                  }
                });
              };
              reader.readAsText(file);
            }}
          >
            <input name="file" type="file" accept=".csv,text/csv" required className="block w-full text-sm" />
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
        </dialog>
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
