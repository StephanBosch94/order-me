"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { updateCustomerAction } from "@/lib/actions/orders";
import type { Customer } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/fields";

export function CustomerForm({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="businessName" label="Naziv firme" defaultValue={customer.businessName} />
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
