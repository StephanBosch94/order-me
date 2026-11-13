"use client";

import { useActionState, useEffect, useState } from "react";

import { updateSettingsAction, type FormState } from "@/lib/actions/catalog";
import type { Organization } from "@/lib/data/types";
import { slugify } from "@/lib/text";
import { SupplierLogo } from "@/components/brand/supplier-logo";
import { AudienceChoice } from "@/components/supplier/audience-choice";
import { Button } from "@/components/ui/button";
import { useUnchangedForm } from "@/components/ui/use-unchanged-form";
import {
  FileDropzone,
  IMAGE_FILE_ACCEPT,
  IMAGE_FILE_TYPES,
  IMAGE_MAX_BYTES,
  IMAGE_SIZE_ERROR,
  IMAGE_TYPE_ERROR,
} from "@/components/ui/file-dropzone";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/fields";
import { formatIpsAccount } from "@/lib/ips";
import { TRADES } from "@/lib/trades";

const initial: FormState = {};
type SettingsTab = "podaci" | "prodaja" | "izgled";

export function SettingsForm({
  organization,
  hasEfakturaApiKey,
  initialTab = "podaci",
}: {
  organization: Organization;
  hasEfakturaApiKey: boolean;
  initialTab?: SettingsTab;
}) {
  const [state, action, pending] = useActionState(updateSettingsAction, initial);
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const changes = useUnchangedForm();

  useEffect(() => {
    if (state.ok) changes.markClean();
  }, [state, changes.markClean]);

  useEffect(() => {
    const errors = state.fieldErrors;
    if (!errors) return;
    const appearance = ["description", "brandColor"];
    if (Object.keys(errors).some((key) => appearance.includes(key))) setTab("izgled");
    else if (Object.keys(errors).length > 0) setTab("podaci");
  }, [state]);

  return (
    <form ref={changes.ref} action={action} className="max-w-2xl space-y-4" onInput={changes.onInput} onChange={changes.onChange}>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <div className="inline-flex rounded-lg border border-border bg-card p-1" role="tablist" aria-label="Podešavanja">
        <SettingsTabButton selected={tab === "podaci"} onClick={() => setTab("podaci")}>
          Podaci
        </SettingsTabButton>
        <SettingsTabButton selected={tab === "prodaja"} onClick={() => setTab("prodaja")}>
          Prodaja
        </SettingsTabButton>
        <SettingsTabButton selected={tab === "izgled"} onClick={() => setTab("izgled")}>
          Izgled stranice
        </SettingsTabButton>
      </div>
      <div className={tab === "podaci" ? "grid gap-4 sm:grid-cols-2" : "hidden"} role="tabpanel">
        <Setting name="name" label="Naziv firme" defaultValue={organization.name} error={state.fieldErrors?.name} />
        <div>
          <Label htmlFor="trade">Delatnost</Label>
          <Select id="trade" name="trade" defaultValue={organization.trade || ""} className="mt-1.5">
            <option value="">Nije izabrana</option>
            {TRADES.map((trade) => (
              <option key={trade.id} value={trade.id}>
                {trade.label}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">Po ovome kupci filtriraju marketplace.</p>
          <FieldError message={state.fieldErrors?.trade} />
        </div>
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
        <div className="sm:col-span-2">
          <Label htmlFor="ipsAccount">IPS kod</Label>
          <Input
            id="ipsAccount"
            name="ipsAccount"
            defaultValue={formatIpsAccount(organization.ipsAccount)}
            placeholder="160-0000000011111-14"
            autoComplete="off"
            spellCheck={false}
            className="mt-1.5 font-mono"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Tekući račun firme, ili IPS kod iz banke. Kupac koji plati IPS-om dobija QR kod, a isti kod stoji i na fakturi.
          </p>
          <FieldError message={state.fieldErrors?.ipsAccount} />
        </div>
      </div>
      <div className={tab === "prodaja" ? "grid gap-4" : "hidden"} role="tabpanel">
        <div className="rounded-lg border border-border bg-card p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="publicStore"
              defaultChecked={organization.publicStore !== false}
              className="mt-0.5 size-4 accent-zinc-950"
            />
            <span>
              <span className="text-sm font-medium">Prodavnica</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Kupci sami poručuju na javnoj stranici. Isključite je ako porudžbine, kupce i ostalo unosite samo vi.
              </span>
            </span>
          </label>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <AudienceChoice defaultValue={organization.audience} error={state.fieldErrors?.audience} />
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="trackStock"
              defaultChecked={organization.trackStock === true}
              className="mt-0.5 size-4 accent-zinc-950"
            />
            <span>
              <span className="text-sm font-medium">Praćenje stanja u magacinu</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Kad je uključeno, svaki proizvod prikazuje stanje u magacinu, a nova porudžbina tu količinu smanjuje.
                Otkazivanje je vraća.
              </span>
            </span>
          </label>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="efakturaEnabled"
              defaultChecked={organization.efakturaEnabled === true}
              className="mt-0.5 size-4 accent-zinc-950"
            />
            <span>
              <span className="text-sm font-medium">Šalji e-fakturu za pravna lica</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Kad je uključeno, fakturu možete poslati kupcu kojeg ste označili da je u sistemu. Nalog za fizičko lice se ne šalje.
              </span>
            </span>
          </label>
          <div className="mt-4">
            <Label htmlFor="efakturaApiKey">API ključ</Label>
            <Input
              id="efakturaApiKey"
              name="efakturaApiKey"
              type="password"
              autoComplete="off"
              spellCheck={false}
              className="mt-1.5"
            />
            <div className="mt-2 space-y-2 text-xs text-muted-foreground">
              {hasEfakturaApiKey ? <p>API ključ je sačuvan. Prazno polje ga ne briše.</p> : null}
              <p>API ključ uzimate vi, za svoju firmu. Kupac ga ne unosi.</p>
              <ol className="list-decimal space-y-1 pl-4">
                <li>
                  Otvorite portal{" "}
                  <a
                    href="https://efaktura.mfin.gov.rs"
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-zinc-300 underline-offset-2 hover:decoration-foreground"
                  >
                    efaktura.mfin.gov.rs
                  </a>
                  .
                </li>
                <li>Prijavite se kvalifikovanim elektronskim sertifikatom. To radi zakonski zastupnik upisan u APR.</li>
                <li>Idite na Podešavanja, pa Upravljanje API, i napravite ključ.</li>
                <li>Nalepite taj ključ ovde i uključite slanje iznad.</li>
              </ol>
              <p>
                Na kartici kupca označite da li je ta firma u sistemu. E-faktura ide samo tako označenom pravnom licu. Ključ nije potreban za štampu fakture.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className={tab === "izgled" ? "grid gap-4 sm:grid-cols-2" : "hidden"} role="tabpanel">
        <LogoField organization={organization} />
        <CoverField organization={organization} />
        <div className="sm:col-span-2">
          <Label htmlFor="description">Opis</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={organization.description}
            maxLength={240}
            className="mt-1.5"
          />
          <p className="mt-1 text-xs text-muted-foreground">Stoji preko naslovne slike u prodavnici.</p>
          <FieldError message={state.fieldErrors?.description} />
        </div>
        <BrandColorSetting
          key={organization.brandColor ?? "none"}
          initial={organization.brandColor}
          error={state.fieldErrors?.brandColor}
        />
      </div>
      <Button type="submit" disabled={pending || changes.unchanged}>
        {pending ? "Čuvanje…" : "Sačuvaj izmene"}
      </Button>
    </form>
  );
}

function SettingsTabButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`h-9 cursor-pointer rounded-md px-3 text-sm font-medium ${selected ? "bg-primary text-primary-foreground" : "text-foreground"}`}
    >
      {children}
    </button>
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
  return (
    <div className="sm:col-span-2">
      <Label htmlFor="logo">Logotip</Label>
      <FileDropzone
        id="logo"
        name="logo"
        accept={IMAGE_FILE_ACCEPT}
        allowedTypes={IMAGE_FILE_TYPES}
        maxBytes={IMAGE_MAX_BYTES}
        heading="Prevucite logotip ovde"
        releaseHeading="Pustite da dodate logotip"
        hint="Kvadrat, 512 × 512 px. JPG, PNG ili WebP, do 2 MB. U zaglavlju se vidi na 48 × 48 px."
        emptyVisual={
          organization.logoUrl ? <SupplierLogo name={organization.name} logoUrl={organization.logoUrl} className="size-12" /> : undefined
        }
        showImagePreview
        sizeError={IMAGE_SIZE_ERROR}
        typeError={IMAGE_TYPE_ERROR}
      />
      {organization.logoUrl ? (
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" name="removeLogo" className="size-4 accent-zinc-950" />
          Uklonite logotip
        </label>
      ) : null}
    </div>
  );
}

function CoverField({ organization }: { organization: Organization }) {
  return (
    <div className="sm:col-span-2">
      <Label htmlFor="cover">Naslovna slika</Label>
      {organization.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={organization.coverUrl} alt="" className="mt-2 h-36 w-full rounded-lg border border-border object-cover" />
      ) : null}
      <FileDropzone
        id="cover"
        name="cover"
        accept={IMAGE_FILE_ACCEPT}
        allowedTypes={IMAGE_FILE_TYPES}
        maxBytes={IMAGE_MAX_BYTES}
        heading="Prevucite naslovnu sliku ovde"
        releaseHeading="Pustite da dodate naslovnu sliku"
        hint="1920 × 640 px. JPG, PNG ili WebP, do 2 MB. Puni širinu stranice, visina je 288 px."
        showImagePreview
        sizeError={IMAGE_SIZE_ERROR}
        typeError={IMAGE_TYPE_ERROR}
      />
      {organization.coverUrl ? (
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" name="removeCover" className="size-4 accent-zinc-950" />
          Uklonite naslovnu sliku
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
