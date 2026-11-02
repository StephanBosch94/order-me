"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { updateCustomerAction } from "@/lib/actions/orders";
import { documentKind, type CustomerParty } from "@/lib/customers";
import type { Customer } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/fields";

export function CustomerForm({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [party, setParty] = useState<CustomerParty>(customer.party === "fizicka" ? "fizicka" : "pravna");
  const [days, setDays] = useState(String(customer.paymentTermDays ?? 15));

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result = await updateCustomerAction(customer.id, new FormData(event.currentTarget));
        setPending(false);
        if (!result.ok) {
          setError(result.message ?? "Čuvanje nije uspelo.");
          return;
        }
        setError("");
        toast.success(result.message ?? "Podaci o kupcu su sačuvani.");
        router.refresh();
      }}
    >
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="max-w-[12rem]">
        <Field name="code" label="Šifra kupca" defaultValue={customer.code} />
        <p className="mt-1.5 text-sm text-muted-foreground">Jedinstvena je unutar vaše distribucije.</p>
      </div>
      <fieldset>
        <legend className="text-sm font-medium">Vrsta kupca</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {(
            [
              ["fizicka", "Fizičko lice"],
              ["pravna", "Pravno lice"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="party"
                value={value}
                checked={party === value}
                onChange={() => setParty(value)}
                className="size-4 accent-primary"
              />
              {label}
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Za {party === "pravna" ? "pravno lice izdaje se faktura" : "fizičko lice izdaje se nalog"}.
        </p>
      </fieldset>
      {party === "pravna" ? (
        <div>
          <Label htmlFor="paymentTermDays">Odloženo plaćanje (dana)</Label>
          <Input
            id="paymentTermDays"
            name="paymentTermDays"
            type="number"
            min={0}
            max={365}
            inputMode="numeric"
            value={days}
            onChange={(event) => setDays(event.target.value)}
            className="mt-1.5 max-w-[10rem]"
          />
          <p className="mt-1.5 text-sm text-muted-foreground">
            Datum valute na fakturi je datum porudžbine plus ovaj broj dana. 0 znači plaćanje odmah.
          </p>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="businessName"
          label={party === "pravna" ? "Naziv firme" : "Ime i prezime"}
          defaultValue={customer.businessName}
        />
        <Field name="contactName" label="Kontakt osoba" defaultValue={customer.contactName} />
        <Field name="email" label="Email" defaultValue={customer.email} type="email" />
        <Field name="phone" label="Telefon" defaultValue={customer.phone} />
        <Field name="pib" label="PIB" defaultValue={customer.pib} />
        <Field name="city" label="Grad" defaultValue={customer.city} />
        <div className="sm:col-span-2">
          <Field name="address" label="Adresa" defaultValue={customer.address} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Interna napomena</Label>
          <Textarea id="notes" name="notes" defaultValue={customer.notes} className="mt-1.5" />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Čuvanje…" : "Sačuvaj izmene"}
      </Button>
      <p className="text-sm text-muted-foreground">
        {documentKind(party) === "faktura" ? "Faktura" : "Nalog"} se štampa uz svaku porudžbinu ovog kupca.
      </p>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} className="mt-1.5" />
    </div>
  );
}
