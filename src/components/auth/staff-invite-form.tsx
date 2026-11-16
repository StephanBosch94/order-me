"use client";

import { useActionState } from "react";

import { acceptStaffInvite, type InviteState } from "@/lib/actions/staff";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/fields";

const initial: InviteState = {};

export function StaffInviteForm({ token, type }: { token: string; type: "invite" | "recovery" }) {
  const [state, action, pending] = useActionState(acceptStaffInvite, initial);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="type" value={type} />
      {state.error ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      <div>
        <Label htmlFor="invite-password">Lozinka</Label>
        <Input id="invite-password" name="password" type="password" autoComplete="new-password" required className="mt-1.5" />
        <FieldError message={state.fieldErrors?.password} />
        <p className="mt-1 text-xs text-muted-foreground">Najmanje 8 karaktera. Lozinku znate samo vi.</p>
      </div>
      <div>
        <Label htmlFor="invite-confirm">Ponovite lozinku</Label>
        <Input id="invite-confirm" name="confirmPassword" type="password" autoComplete="new-password" required className="mt-1.5" />
        <FieldError message={state.fieldErrors?.confirmPassword} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Čuvanje…" : "Sačuvajte lozinku"}
      </Button>
    </form>
  );
}
