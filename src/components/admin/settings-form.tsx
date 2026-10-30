"use client";

import { Upload } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { updateSettingsAction, type FormState } from "@/lib/actions/catalog";
import type { Organization } from "@/lib/data/types";
import { slugify } from "@/lib/text";
import { cn } from "@/lib/utils";
import { SupplierLogo } from "@/components/brand/supplier-logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/fields";

const LOGO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

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
          prefix="/shop/"
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
        <LogoField organization={organization} />
        <BrandColorSetting
          key={organization.brandColor ?? "none"}
          initial={organization.brandColor}
          error={state.fieldErrors?.brandColor}
        />
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

function normalizeHex(value: string) {
  const trimmed = value.trim();
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed.toLowerCase()}`;
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  return value;
}

function BrandColorSetting({ initial, error }: { initial: string | null; error?: string }) {
  const [value, setValue] = useState(initial ?? "");
  const picker = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#18181b";

  return (
    <div className="sm:col-span-2">
      <Label htmlFor="brandColor">Boja brenda</Label>
      <div className="mt-2 flex items-center gap-3">
        <input
          type="color"
          aria-label="Izaberite boju brenda"
          value={picker}
          onChange={(event) => setValue(event.target.value.toLowerCase())}
          className="size-10 shrink-0 cursor-pointer rounded-md border border-border bg-card p-1"
        />
        <Input
          id="brandColor"
          name="brandColor"
          value={value}
          onChange={(event) => setValue(normalizeHex(event.target.value))}
          placeholder="#14532d"
          spellCheck={false}
          autoComplete="off"
          className="max-w-40 font-mono"
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Upišite hex, na primer #14532d, ili izaberite boju. Dugmad na stranici je koriste.</p>
      {initial ? (
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" name="clearBrandColor" className="size-4 accent-zinc-950" />
          Bez posebne boje
        </label>
      ) : null}
      <FieldError message={error} />
    </div>
  );
}

function LogoField({ organization }: { organization: Organization }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [over, setOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [reject, setReject] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  function showPreview(next: string | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next;
    setPreview(next);
  }

  function take(list: FileList | null) {
    const file = list?.[0];
    const input = inputRef.current;
    if (!input || !file || file.size === 0) return;
    if (!LOGO_TYPES.has(file.type) || file.size > LOGO_MAX_BYTES) {
      input.value = "";
      setFileName(null);
      showPreview(null);
      setReject(file.size > LOGO_MAX_BYTES ? "Slika može imati najviše 2 MB." : "Dozvoljeni formati slike su JPG, PNG i WebP.");
      return;
    }
    if (input.files?.[0] !== file) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
    }
    setReject(null);
    setFileName(file.name);
    showPreview(URL.createObjectURL(file));
  }

  return (
    <div className="sm:col-span-2">
      <Label htmlFor="logo">Logotip</Label>
      <label
        onDragEnter={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          take(event.dataTransfer.files);
        }}
        className={cn(
          "mt-2 flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-8 text-center transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25",
          over && "border-primary bg-zinc-50",
        )}
      >
        <input
          ref={inputRef}
          id="logo"
          name="logo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => take(event.target.files)}
        />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="size-12 rounded-md border border-border bg-white object-contain" />
        ) : organization.logoUrl ? (
          <SupplierLogo name={organization.name} logoUrl={organization.logoUrl} className="size-12" />
        ) : (
          <span className="flex size-12 items-center justify-center rounded-md border border-border bg-zinc-50 text-muted-foreground">
            <Upload className="size-5" aria-hidden="true" />
          </span>
        )}
        <p className="mt-3 text-sm font-medium">{over ? "Pustite da dodate logotip" : "Prevucite logotip ovde"}</p>
        <span className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "pointer-events-none mt-3")}>Izaberite fajl</span>
        {fileName ? <p className="mt-2 max-w-full truncate text-sm">{fileName}</p> : null}
        <p className="mt-2 text-xs text-muted-foreground">JPG, PNG ili WebP, do 2 MB. Prikazuje se kupcima na stranici za poručivanje.</p>
        {reject ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {reject}
          </p>
        ) : null}
      </label>
      {organization.logoUrl ? (
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" name="removeLogo" className="size-4 accent-zinc-950" />
          Uklonite logotip
        </label>
      ) : null}
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
