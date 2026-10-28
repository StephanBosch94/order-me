"use client";

import { useActionState, useState } from "react";

import { updateSettingsAction, type FormState } from "@/lib/actions/catalog";
import type { Organization } from "@/lib/data/types";
import { slugify } from "@/lib/text";
import { SupplierLogo } from "@/components/brand/supplier-logo";
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
        <SlugSetting
          key={organization.slug}
          prefix={organization.channel === "b2c" ? "/shop/" : "/s/"}
          initial={organization.slug}
          error={state.fieldErrors?.slug}
        />
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
          <Label htmlFor="logo">Logotip</Label>
          <div className="mt-2 flex items-center gap-3">
            <SupplierLogo name={organization.name} logoUrl={organization.logoUrl} />
            <div className="min-w-0 flex-1">
              <Input id="logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp" />
              <p className="mt-1 text-xs text-muted-foreground">JPG, PNG ili WebP, do 2 MB. Prikazuje se kupcima na stranici za poručivanje.</p>
            </div>
          </div>
          {organization.logoUrl ? (
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" name="removeLogo" className="size-4 accent-zinc-950" />
              Uklonite logotip
            </label>
          ) : null}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="brandColor">Boja brenda</Label>
          <div className="mt-2 flex items-center gap-3">
            <input
              id="brandColor"
              name="brandColor"
              type="color"
              defaultValue={organization.brandColor ?? "#18181b"}
              className="size-10 cursor-pointer rounded-md border border-border bg-card p-1"
            />
            <p className="text-sm text-muted-foreground">Dugmad i oznake na stranici za poručivanje koriste ovu boju.</p>
          </div>
          {organization.brandColor ? (
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" name="clearBrandColor" className="size-4 accent-zinc-950" />
              Bez posebne boje
            </label>
          ) : null}
          <FieldError message={state.fieldErrors?.brandColor} />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Čuvanje…" : "Sačuvaj izmene"}
      </Button>
    </form>
  );
}

function slugDraft(value: string) {
  const cleaned = slugify(value);
  if (cleaned && /[-\s]$/.test(value)) return `${cleaned}-`.slice(0, 48);
  return cleaned;
}

function SlugSetting({ prefix, initial, error }: { prefix: string; initial: string; error?: string }) {
  const [slug, setSlug] = useState(initial);
  return (
    <div className="sm:col-span-2">
      <Label htmlFor="slug">Adresa stranice</Label>
      <div className="mt-1.5 flex h-10 overflow-hidden rounded-md border border-input bg-card focus-within:ring-2 focus-within:ring-ring/25">
        <span className="flex items-center bg-zinc-50 px-3 text-sm text-muted-foreground">{prefix}</span>
        <input
          id="slug"
          name="slug"
          value={slug}
          onChange={(event) => setSlug(slugDraft(event.target.value))}
          className="min-w-0 flex-1 px-3 text-sm outline-none"
          required
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Pri otvaranju naloga adresa je naziv firme. Ovde je možete promeniti.</p>
      <FieldError message={error} />
    </div>
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
