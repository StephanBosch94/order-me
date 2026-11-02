"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { useUnchangedForm } from "@/components/ui/use-unchanged-form";
import { Input, Select, Textarea } from "@/components/ui/fields";
import {
  setOrganizationActiveAction,
  updatePlanAction,
  updateSubscriptionAction,
  updateSupplierNoteAction,
  type PlatformState,
} from "@/lib/actions/platform";
import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/data/types";
import { SUBSCRIPTION_STATUS_OPTIONS } from "@/components/platform/copy";

const initial: PlatformState = { error: "" };

function useSavedClean(pending: boolean, error: string, markClean: () => void) {
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !error) markClean();
    wasPending.current = pending;
  }, [pending, error, markClean]);
}

export function ActiveToggle({
  organizationId,
  slug,
  active,
}: {
  organizationId: string;
  slug: string;
  active: boolean;
}) {
  const [state, action, pending] = useActionState(setOrganizationActiveAction, initial);
  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {active ? "Deaktiviraj" : "Aktiviraj"}
      </Button>
      {state.error ? <FormError message={state.error} /> : null}
    </form>
  );
}

export function PlanForm({ plan, price }: { plan: SubscriptionPlan; price: string }) {
  const [state, action, pending] = useActionState(updatePlanAction, initial);
  const changes = useUnchangedForm();
  useSavedClean(pending, state.error, changes.markClean);
  return (
    <form ref={changes.ref} action={action} onInput={changes.onInput} onChange={changes.onChange} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-end">
      <input type="hidden" name="planId" value={plan.id} />
      <div>
        <label className="text-xs text-muted-foreground" htmlFor={`name-${plan.id}`}>
          Naziv
        </label>
        <Input id={`name-${plan.id}`} name="name" defaultValue={plan.name} required className="mt-1" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground" htmlFor={`price-${plan.id}`}>
          Mesečna cena
        </label>
        <Input id={`price-${plan.id}`} name="monthlyPrice" defaultValue={price} inputMode="decimal" required className="mt-1" />
      </div>
      <Button type="submit" size="sm" disabled={pending || changes.unchanged}>
        Sačuvaj
      </Button>
      {state.error ? <FormError message={state.error} /> : null}
    </form>
  );
}

export function SubscriptionForm({
  organizationId,
  planId,
  status,
  plans,
}: {
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  plans: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(updateSubscriptionAction, initial);
  const changes = useUnchangedForm();
  useSavedClean(pending, state.error, changes.markClean);
  return (
    <form ref={changes.ref} action={action} onInput={changes.onInput} onChange={changes.onChange} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
      <input type="hidden" name="organizationId" value={organizationId} />
      <Select name="planId" defaultValue={planId} aria-label="Paket">
        {plans.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {plan.name}
          </option>
        ))}
      </Select>
      <Select name="status" defaultValue={status} aria-label="Status pretplate">
        {SUBSCRIPTION_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <Button type="submit" size="sm" disabled={pending || changes.unchanged}>
        Sačuvaj
      </Button>
      {state.error ? <FormError message={state.error} /> : null}
    </form>
  );
}

export function NoteForm({ organizationId, note }: { organizationId: string; note: string }) {
  const [state, action, pending] = useActionState(updateSupplierNoteAction, initial);
  const changes = useUnchangedForm();
  useSavedClean(pending, state.error, changes.markClean);
  return (
    <form ref={changes.ref} action={action} onInput={changes.onInput} onChange={changes.onChange} className="space-y-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      <Textarea name="note" defaultValue={note} aria-label="Interna beleška" maxLength={2000} />
      <Button type="submit" size="sm" variant="secondary" disabled={pending || changes.unchanged}>
        Sačuvaj belešku
      </Button>
      {state.error ? <FormError message={state.error} /> : null}
    </form>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p role="alert" className="text-sm text-destructive sm:col-span-full">
      {message}
    </p>
  );
}
