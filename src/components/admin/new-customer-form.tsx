"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createCustomerAction } from "@/lib/actions/orders";
import type { CustomerParty } from "@/lib/customers";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/fields";

export function NewCustomerForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [party, setParty] = useState<CustomerParty>("pravna");
  const [days, setDays] = useState("15");
  const [inSef, setInSef] = useState(false);

  return (
    <form
      className="max-w-3xl space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result = await createCustomerAction(new FormData(event.currentTarget));
        setPending(false);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        toast.success(result.message);
        router.push(`/customers/${result.id}`);
        router.refresh();
      }}
    >
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="businessName" label={party === "pravna" ? "Naziv firme" : "Ime i prezime"} />
        <Field name="contactName" label="Kontakt osoba" />
        <Field name="email" label="Email" type="email" />
        <Field name="phone" label="Telefon" />
        <Field name="pib" label="PIB" />
        <Field name="city" label="Grad" />
        <div className="sm:col-span-2">
          <Field name="address" label="Adresa" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Interna napomena</Label>
          <Textarea id="notes" name="notes" className="mt-1.5" />
        </div>
      </div>
      <div className="max-w-[12rem]">
        <Field name="code" label="Šifra kupca" placeholder="K-0005" />
        <p className="mt-1.5 text-sm text-muted-foreground">Ako ostavite prazno, dodelićemo sledeću slobodnu šifru.</p>
      </div>
      <fieldset>
        <legend className="text-sm font-medium">Vrsta kupca</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {(
            [
              ["pravna", "Pravno lice"],
              ["fizicka", "Fizičko lice"],
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
          <label className="mt-4 flex items-start gap-3">
            <input
              type="checkbox"
              name="sefRegistered"
              value="on"
              checked={inSef}
              onChange={(event) => setInSef(event.target.checked)}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              <span className="text-sm font-medium">U sistemu elektronskih faktura</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Označite ako je ova firma registrovana na portalu eFaktura. E-faktura se šalje samo tako označenom kupcu.
              </span>
            </span>
          </label>
        </div>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Čuvanje…" : "Dodaj kupca"}
      </Button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} placeholder={placeholder} className="mt-1.5" />
    </div>
  );
}
