"use client";

import { useActionState } from "react";

import { loginAction, signupAction, type AuthState } from "@/lib/actions/auth";
import { AudienceChoice } from "@/components/supplier/audience-choice";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/fields";

const initial: AuthState = { error: "" };

export function LoginForm({ nextPath, demo }: { nextPath: string; demo: boolean }) {
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
      {demo ? (
        <p className="rounded-md bg-zinc-50 px-3 py-2 text-xs leading-5 text-muted-foreground">
          Mesara Pajić, pravna lica: ana@mesarapajic.rs / poruci-demo
          <br />
          Mercis Atelier, fizička lica: vera@mercisatelier.rs / poruci-demo
          <br />
          Kupac pravnog lica: marko@restorandunav.rs / poruci-demo
          <br />
          Kupac fizičkog lica: jovana@mercisatelier.rs / poruci-demo
          <br />
          Administracija: admin@prodora.rs / poruci-demo
        </p>
      ) : null}
    </form>
  );
}

export function SignupForm({ mode, nextPath }: { mode: "supplier" | "buyer" | "buyer-shop"; nextPath?: string }) {
  const [state, action, pending] = useActionState(signupAction, initial);
  const supplier = mode === "supplier";

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert message={state.error} /> : null}
      <input type="hidden" name="kind" value={supplier ? "supplier" : "buyer"} />
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      <Field name="name" label="Ime i prezime" autoComplete="name" error={state.fieldErrors?.name} />
      <Field name="email" label="Email" type="email" autoComplete="email" error={state.fieldErrors?.email} />
      {supplier ? null : (
        <>
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
      {supplier ? (
        <>
          <Field name="organizationName" label="Naziv prodavnice" error={state.fieldErrors?.organizationName} />
          <p className="text-sm text-muted-foreground">Adresa stranice pravi se od naziva. Možete je promeniti u podešavanjima.</p>
          <AudienceChoice defaultValue="oba" error={state.fieldErrors?.audience} />
          <Field name="phone" label="Telefon" autoComplete="tel" required={false} error={state.fieldErrors?.phone} />
        </>
      ) : (
        <>
          <Field name="businessName" label="Naziv firme" autoComplete="organization" error={state.fieldErrors?.businessName} />
          <Field name="phone" label="Telefon" autoComplete="tel" error={state.fieldErrors?.phone} />
          <Field name="address" label="Adresa" autoComplete="street-address" error={state.fieldErrors?.address} />
          <Field name="city" label="Grad" autoComplete="address-level2" error={state.fieldErrors?.city} />
          <Field name="postalCode" label="Poštanski broj" autoComplete="postal-code" error={state.fieldErrors?.postalCode} />
          <Field name="pib" label="PIB" error={state.fieldErrors?.pib} />
          <Field name="mb" label="Matični broj" error={state.fieldErrors?.mb} />
        </>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Kreiranje…" : supplier ? "Otvorite prodavnicu" : "Otvorite nalog"}
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
  onChange,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  error?: string;
  required?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
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

function Alert({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {message}
    </p>
  );
}
