"use client";

import { useActionState, useEffect, useRef } from "react";

import { addEmployeeAction, type EmployeeState } from "@/lib/actions/staff";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/fields";

const initial: EmployeeState = {};

export function EmployeeForm() {
  const [state, action, pending] = useActionState(addEmployeeAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
      {state.error ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      {state.ok && state.message ? (
        <p className="text-sm text-emerald-700 sm:col-span-2">{state.message}</p>
      ) : null}
      <div>
        <Label htmlFor="employee-name">Ime</Label>
        <Input id="employee-name" name="name" autoComplete="name" required className="mt-1.5" />
        <FieldError message={state.fieldErrors?.name} />
      </div>
      <div>
        <Label htmlFor="employee-email">Email</Label>
        <Input id="employee-email" name="email" type="email" autoComplete="off" required className="mt-1.5" />
        <FieldError message={state.fieldErrors?.email} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="employee-password">Lozinka</Label>
        <Input
          id="employee-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="mt-1.5"
        />
        <FieldError message={state.fieldErrors?.password} />
        <p className="mt-1 text-xs text-muted-foreground">Najmanje 8 karaktera. Zaposleni je koristi za prvu prijavu.</p>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Dodavanje…" : "Dodaj zaposlenog"}
        </Button>
      </div>
    </form>
  );
}
