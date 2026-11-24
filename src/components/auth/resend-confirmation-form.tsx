"use client";

import { useActionState } from "react";

import { resendSignupConfirmationAction, type ConfirmationState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";

const initial: ConfirmationState = {};

export function ResendConfirmationForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(resendSignupConfirmationAction, initial);
  return (
    <form key={state.sentAt ?? "new"} action={action} className="mt-6 space-y-3 border-t border-border pt-6">
      <input type="hidden" name="next" value={nextPath} />
      <div>
        <Label htmlFor="confirmation-email">Email za registraciju</Label>
        <Input id="confirmation-email" name="email" type="email" autoComplete="email" required className="mt-1.5" />
      </div>
      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
      {state.message ? <p role="status" className="text-sm text-emerald-700">{state.message}</p> : null}
      <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
        {pending ? "Slanje…" : "Pošaljite novi link"}
      </Button>
    </form>
  );
}
