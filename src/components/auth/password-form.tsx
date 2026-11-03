"use client";

import { useActionState } from "react";

import { changePasswordAction, type PasswordState } from "@/lib/actions/password";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/fields";
import { useUnchangedForm } from "@/components/ui/use-unchanged-form";

const initial: PasswordState = {};

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initial);

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Lozinka</h2>
        <p className="mt-1 text-sm text-muted-foreground">Posle čuvanja šaljemo obaveštenje na email naloga.</p>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.ok && state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <PasswordFields key={state.savedAt ?? "new"} action={action} pending={pending} fieldErrors={state.fieldErrors} />
    </div>
  );
}

function PasswordFields({
  action,
  pending,
  fieldErrors,
}: {
  action: (formData: FormData) => void;
  pending: boolean;
  fieldErrors?: Record<string, string>;
}) {
  const changes = useUnchangedForm();
  return (
    <form ref={changes.ref} action={action} onInput={changes.onInput} onChange={changes.onChange} className="space-y-4">
      <div>
        <Label htmlFor="current-password">Trenutna lozinka</Label>
        <Input
          id="current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1.5"
        />
        <FieldError message={fieldErrors?.currentPassword} />
      </div>
      <div>
        <Label htmlFor="next-password">Nova lozinka</Label>
        <Input
          id="next-password"
          name="nextPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1.5"
        />
        <FieldError message={fieldErrors?.nextPassword} />
      </div>
      <div>
        <Label htmlFor="confirm-password">Ponovite novu lozinku</Label>
        <Input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1.5"
        />
        <FieldError message={fieldErrors?.confirmPassword} />
      </div>
      <Button type="submit" disabled={pending || changes.unchanged}>
        {pending ? "Čuvanje…" : "Promenite lozinku"}
      </Button>
    </form>
  );
}
