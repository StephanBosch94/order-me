"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

import { loginAction, signupAction, type AuthState } from "@/lib/actions/auth";
import { BuyerKindChoice, type BuyerKind } from "@/components/shop/checkout-kind";
import { AudienceChoice } from "@/components/supplier/audience-choice";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/fields";
import { showOnlineStore } from "@/lib/marketing";

const initial: AuthState = { error: "" };

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      {state.error ? <Alert message={state.error} /> : null}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required className="mt-1.5" />
        <FieldError message={state.fieldErrors?.email} />
      </div>
      <div>
        <Label htmlFor="password">Lozinka</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="mt-1.5" />
        <FieldError message={state.fieldErrors?.password} />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Prijava…" : "Prijavite se"}
      </Button>
    </form>
  );
}

export function SignupForm({ mode, nextPath }: { mode: "supplier" | "buyer" | "buyer-shop"; nextPath?: string }) {
  const [state, action, pending] = useActionState(signupAction, initial);
  const [party, setParty] = useState<BuyerKind>("fizicka");
  const supplier = mode === "supplier";
  const company = party === "pravna";

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert message={state.error} /> : null}
      <input type="hidden" name="kind" value={supplier ? "supplier" : "buyer"} />
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      <Field name="name" label="Ime i prezime" autoComplete="name" error={state.fieldErrors?.name} />
      <Field name="email" label="Email" type="email" autoComplete="email" error={state.fieldErrors?.email} />
      {supplier ? null : (
        <>
          <input type="hidden" name="profile" value={company ? "firma" : "osoba"} />
          <BuyerKindChoice value={party} legend="Nalog je za" onChange={setParty} />
          <Field
            name="confirmationEmail"
            label="Email za potvrde"
            type="email"
            autoComplete="email"
            required={false}
            error={state.fieldErrors?.confirmationEmail}
          />
          <p className="text-sm text-muted-foreground">
            Potvrde porudžbine stižu na ovu adresu. Može biti drugačija od emaila za prijavu. Ako je prazno, stižu na email za prijavu.
          </p>
        </>
      )}
      <Field name="password" label="Lozinka" type="password" autoComplete="new-password" error={state.fieldErrors?.password} />
      <Field
        name="confirmPassword"
        label="Potvrda lozinke"
        type="password"
        autoComplete="new-password"
        error={state.fieldErrors?.confirmPassword}
      />
      {supplier ? (
        <>
          <Field
            name="organizationName"
            label="Naziv prodavnice"
            info="Adresa stranice pravi se od naziva. Možete je promeniti u podešavanjima."
            error={state.fieldErrors?.organizationName}
          />
          {showOnlineStore ? (
            <AudienceChoice defaultValue="oba" error={state.fieldErrors?.audience} />
          ) : (
            <input type="hidden" name="audience" value="pravna" />
          )}
        </>
      ) : (
        <>
          {company ? (
            <Field name="businessName" label="Naziv firme" autoComplete="organization" error={state.fieldErrors?.businessName} />
          ) : null}
          <Field name="phone" label="Telefon" autoComplete="tel" error={state.fieldErrors?.phone} />
          <Field name="address" label="Adresa" autoComplete="street-address" error={state.fieldErrors?.address} />
          <Field name="city" label="Grad" autoComplete="address-level2" error={state.fieldErrors?.city} />
          <Field name="postalCode" label="Poštanski broj" autoComplete="postal-code" error={state.fieldErrors?.postalCode} />
          {company ? (
            <>
              <Field name="pib" label="PIB" error={state.fieldErrors?.pib} />
              <Field name="mb" label="Matični broj" error={state.fieldErrors?.mb} />
            </>
          ) : null}
        </>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Kreiranje…" : supplier ? "Otvorite veleprodaju" : "Otvorite nalog"}
      </Button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  autoComplete,
  error,
  required = true,
  info,
  onChange,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  error?: string;
  required?: boolean;
  info?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label htmlFor={name}>{label}</Label>
        {info ? <InfoTip text={info} label={label} /> : null}
      </div>
      <Input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="mt-1.5"
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      />
      <FieldError message={error} />
    </div>
  );
}

function InfoTip({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-zinc-100 hover:text-foreground"
        aria-label={`Više o polju ${label}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Info className="size-4" aria-hidden="true" />
      </button>
      {open ? (
        <p
          id={panelId}
          role="note"
          className="absolute top-8 left-0 z-20 w-64 rounded-md border border-border bg-card p-3 text-sm text-muted-foreground shadow-md"
        >
          {text}
        </p>
      ) : null}
    </div>
  );
}

function Alert({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {message}
    </p>
  );
}
