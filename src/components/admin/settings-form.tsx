"use client";

import { useActionState } from "react";

import { updateSettingsAction, type FormState } from "@/lib/actions/catalog";
import type { Organization } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/fields";

const initial: FormState = {};

export function SettingsForm({ organization }: { organization: Organization }) {
  const [state, action, pending] = useActionState(updateSettingsAction, initial);
  return (
    <form action={action} className="max-w-2xl space-y-4">
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Setting name="name" label="Naziv firme" defaultValue={organization.name} error={state.fieldErrors?.name} />
        <Setting name="slug" label="Adresa stranice" defaultValue={organization.slug} error={state.fieldErrors?.slug} />
        <Setting name="email" label="Email firme" defaultValue={organization.email} type="email" error={state.fieldErrors?.email} />
        <Setting
          name="notificationEmail"
          label="Email za nove porudžbine"
          defaultValue={organization.notificationEmail}
          type="email"
          error={state.fieldErrors?.notificationEmail}
        />
        <Setting name="phone" label="Telefon" defaultValue={organization.phone} error={state.fieldErrors?.phone} />
        <Setting name="city" label="Grad" defaultValue={organization.city} error={state.fieldErrors?.city} />
        <div className="sm:col-span-2">
          <Setting name="address" label="Adresa" defaultValue={organization.address} error={state.fieldErrors?.address} />
        </div>
        <Setting name="pib" label="PIB" defaultValue={organization.pib} error={state.fieldErrors?.pib} />
        <Setting name="mb" label="Matični broj" defaultValue={organization.mb} error={state.fieldErrors?.mb} />
        <div className="sm:col-span-2">
          <Setting name="logoUrl" label="Adresa logotipa" defaultValue={organization.logoUrl ?? ""} error={state.fieldErrors?.logoUrl} />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Čuvanje…" : "Sačuvaj izmene"}
      </Button>
    </form>
  );
}

function Setting({
  name,
  label,
  defaultValue,
  error,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue: string;
  error?: string;
  type?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} className="mt-1.5" />
      <FieldError message={error} />
    </div>
  );
}
