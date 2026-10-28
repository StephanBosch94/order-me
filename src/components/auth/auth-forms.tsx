"use client";

import { useActionState, useState } from "react";

import { loginAction, signupAction, type AuthState } from "@/lib/actions/auth";
import { slugify } from "@/lib/text";
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

export function SignupForm({ mode }: { mode: "b2c" | "b2b" | "buyer" }) {
  const [state, action, pending] = useActionState(signupAction, initial);
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const supplier = mode !== "buyer";

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert message={state.error} /> : null}
      <input type="hidden" name="kind" value={supplier ? "supplier" : "buyer"} />
      {supplier ? <input type="hidden" name="channel" value={mode} /> : null}
      <Field name="name" label="Ime i prezime" autoComplete="name" error={state.fieldErrors?.name} />
      <Field name="email" label="Email" type="email" autoComplete="email" error={state.fieldErrors?.email} />
      <Field name="password" label="Lozinka" type="password" autoComplete="new-password" error={state.fieldErrors?.password} />
      {supplier ? (
        <>
          <Field
            name="organizationName"
            label={mode === "b2c" ? "Naziv prodavnice" : "Naziv firme"}
            error={state.fieldErrors?.organizationName}
            onChange={(value) => {
              if (!slugEdited) setSlug(slugify(value));
            }}
          />
          <div>
            <Label htmlFor="slug">Adresa stranice</Label>
            <div className="mt-1.5 flex h-10 overflow-hidden rounded-md border border-input bg-card focus-within:ring-2 focus-within:ring-ring/25">
              <span className="flex items-center bg-zinc-50 px-3 text-sm text-muted-foreground">
                {mode === "b2c" ? "/shop/" : "/s/"}
              </span>
              <input
                id="slug"
                name="slug"
                value={slug}
                onChange={(event) => {
                  setSlugEdited(true);
                  setSlug(slugify(event.target.value));
                }}
                className="min-w-0 flex-1 px-3 text-sm outline-none"
                required
              />
            </div>
            <FieldError message={state.fieldErrors?.slug} />
          </div>
          <Field name="phone" label="Telefon" autoComplete="tel" required={false} error={state.fieldErrors?.phone} />
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
        {pending ? "Kreiranje…" : mode === "b2c" ? "Otvorite prodavnicu" : mode === "buyer" ? "Otvorite nalog kupca" : "Otvorite B2B nalog"}
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
