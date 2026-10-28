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

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, initial);
  const [kind, setKind] = useState<"supplier" | "buyer">("supplier");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert message={state.error} /> : null}
      <fieldset>
        <legend className="text-sm font-medium">Otvarate nalog kao</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(
            [
              ["supplier", "Prodavac", "Imate katalog i primate porudžbine."],
              ["buyer", "Kupac", "Poručujete od dobavljača."],
            ] as const
          ).map(([value, title, body]) => (
            <label
              key={value}
              className={`cursor-pointer rounded-md border px-3 py-3 ${
                kind === value ? "border-foreground bg-zinc-50" : "border-border bg-card"
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={value}
                checked={kind === value}
                onChange={() => setKind(value)}
                className="sr-only"
              />
              <span className="block text-sm font-medium">{title}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{body}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field name="name" label="Ime i prezime" autoComplete="name" error={state.fieldErrors?.name} />
      <Field name="email" label="Email" type="email" autoComplete="email" error={state.fieldErrors?.email} />
      <Field name="password" label="Lozinka" type="password" autoComplete="new-password" error={state.fieldErrors?.password} />
      {kind === "supplier" ? (
        <>
          <Field
            name="organizationName"
            label="Naziv firme"
            error={state.fieldErrors?.organizationName}
            onChange={(value) => {
              if (!slugEdited) setSlug(slugify(value));
            }}
          />
          <div>
            <Label htmlFor="slug">Adresa stranice</Label>
            <div className="mt-1.5 flex h-10 overflow-hidden rounded-md border border-input bg-card focus-within:ring-2 focus-within:ring-ring/25">
              <span className="flex items-center bg-zinc-50 px-3 text-sm text-muted-foreground">/s/</span>
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
        {pending ? "Kreiranje…" : kind === "buyer" ? "Otvorite nalog kupca" : "Otvorite nalog prodavca"}
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
