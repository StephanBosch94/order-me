"use client";

import { useActionState } from "react";

import { AUDIENCES } from "@/lib/constants";
import { loginAction, signupAction, type AuthState } from "@/lib/actions/auth";
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
          Demo nalog: ana@gastrosupply.rs / poruci-demo
        </p>
      ) : null}
    </form>
  );
}

export function SignupForm({ mode, nextPath }: { mode: "supplier" | "buyer" | "buyer-shop"; nextPath?: string }) {
  const [state, action, pending] = useActionState(signupAction, initial);
  const supplier = mode === "supplier";
  const person = mode === "buyer-shop";

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert message={state.error} /> : null}
      <input type="hidden" name="kind" value={supplier ? "supplier" : "buyer"} />
      {person ? <input type="hidden" name="profile" value="osoba" /> : null}
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
      <Field name="name" label="Ime i prezime" autoComplete="name" error={state.fieldErrors?.name} />
      <Field name="email" label="Email" type="email" autoComplete="email" error={state.fieldErrors?.email} />
      <Field name="password" label="Lozinka" type="password" autoComplete="new-password" error={state.fieldErrors?.password} />
      {supplier ? (
        <>
          <Field name="organizationName" label="Naziv prodavnice" error={state.fieldErrors?.organizationName} />
          <p className="text-sm text-muted-foreground">Adresa stranice pravi se od naziva. Možete je promeniti u podešavanjima.</p>
          <fieldset>
            <legend className="text-sm font-medium">Kome prodajete</legend>
            <div className="mt-2 space-y-2">
              {AUDIENCES.map((item) => (
                <label key={item.value} className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="audience"
                    value={item.value}
                    defaultChecked={item.value === "oba"}
                    required
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span>
                    <span className="font-medium">{item.label}</span>
                    <span className="mt-0.5 block text-muted-foreground">{item.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <FieldError message={state.fieldErrors?.audience} />
          </fieldset>
          <Field name="phone" label="Telefon" autoComplete="tel" required={false} error={state.fieldErrors?.phone} />
        </>
      ) : person ? (
        <>
          <Field name="phone" label="Telefon" autoComplete="tel" error={state.fieldErrors?.phone} />
          <Field name="address" label="Adresa" autoComplete="street-address" required={false} error={state.fieldErrors?.address} />
          <Field name="city" label="Grad" autoComplete="address-level2" required={false} error={state.fieldErrors?.city} />
        </>
      ) : (
        <>
          <Field name="businessName" label="Naziv firme" error={state.fieldErrors?.businessName} />
          <Field name="phone" label="Telefon" autoComplete="tel" error={state.fieldErrors?.phone} />
          <Field name="city" label="Grad" autoComplete="address-level2" required={false} error={state.fieldErrors?.city} />
          <Field name="address" label="Adresa" autoComplete="street-address" required={false} error={state.fieldErrors?.address} />
          <Field name="pib" label="PIB" required={false} error={state.fieldErrors?.pib} />
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
