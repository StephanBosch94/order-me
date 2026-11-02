"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { createStaffOrderAction } from "@/lib/actions/orders";
import { unitLabel } from "@/lib/constants";
import type { CustomerSummary, Product } from "@/lib/data/types";
import { effectivePricePara } from "@/lib/data/pricing";
import { formatRsd } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/fields";

type Line = { key: string; productId: string; quantity: string };

function parseQuantity(value: string) {
  const quantity = Number(value.trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(quantity) ? quantity : null;
}

export function StaffOrderForm({
  customers,
  products,
  customerId,
}: {
  customers: CustomerSummary[];
  products: Product[];
  customerId?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(
    customers.some((customer) => customer.id === customerId) ? customerId ?? "" : "",
  );
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ key: "line-1", productId: "", quantity: "1" }]);
  const initialCustomer = customers.some((customer) => customer.id === customerId) ? customerId ?? "" : "";
  const unchanged =
    selectedCustomer === initialCustomer &&
    notes === "" &&
    lines.length === 1 &&
    lines[0]?.productId === "" &&
    lines[0]?.quantity === "1";

  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const product = products.find((item) => item.id === line.productId);
        const quantity = parseQuantity(line.quantity);
        if (!product || quantity == null || quantity <= 0) return sum;
        return sum + Math.round(effectivePricePara(product) * quantity);
      }, 0),
    [lines, products],
  );

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  return (
    <form
      className="max-w-3xl space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const items = lines.flatMap((line) => {
          const quantity = parseQuantity(line.quantity);
          if (!line.productId || quantity == null) return [];
          return [{ productId: line.productId, quantity }];
        });
        const result = await createStaffOrderAction({
          customerId: selectedCustomer,
          notes,
          items,
        });
        setPending(false);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        toast.success(result.message);
        router.push(`/orders/${result.id}`);
        router.refresh();
      }}
    >
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div>
        <Label htmlFor="customerId">Kupac</Label>
        <Select
          id="customerId"
          value={selectedCustomer}
          onChange={(event) => setSelectedCustomer(event.target.value)}
          className="mt-1.5"
          required
        >
          <option value="">Izaberite kupca</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.code} · {customer.businessName}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Stavke</h2>
        {lines.map((line) => {
          const product = products.find((item) => item.id === line.productId);
          return (
            <div key={line.key} className="grid gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
              <div>
                <Label htmlFor={`product-${line.key}`}>Proizvod</Label>
                <Select
                  id={`product-${line.key}`}
                  value={line.productId}
                  onChange={(event) => updateLine(line.key, { productId: event.target.value })}
                  className="mt-1.5"
                >
                  <option value="">Izaberite proizvod</option>
                  {products.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.sku ? ` · ${item.sku}` : ""}
                      {item.active ? "" : " · neaktivan"}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor={`quantity-${line.key}`}>
                  Količina{product ? ` (${unitLabel(product.unit).toLowerCase()})` : ""}
                </Label>
                <input
                  id={`quantity-${line.key}`}
                  value={line.quantity}
                  inputMode="decimal"
                  onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                  className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={lines.length === 1}
                  onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                >
                  Ukloni
                </Button>
              </div>
            </div>
          );
        })}
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setLines((current) => [...current, { key: crypto.randomUUID(), productId: "", quantity: "1" }])
            }
          >
            Dodaj stavku
          </Button>
          <p className="text-sm">
            Ukupno <span className="font-semibold tabular-nums">{formatRsd(total)}</span>
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Napomena</Label>
        <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1.5" />
      </div>
      <Button type="submit" disabled={pending || unchanged}>
        {pending ? "Čuvanje…" : "Sačuvaj porudžbinu"}
      </Button>
    </form>
  );
}
