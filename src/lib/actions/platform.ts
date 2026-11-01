"use server";

import { revalidatePath } from "next/cache";

import { requirePlatformSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";
import type { SubscriptionStatus } from "@/lib/data/types";
import { DataError } from "@/lib/errors";
import { parseRsdToPara } from "@/lib/format";

export type PlatformState = { error: string };

const STATUSES = new Set<SubscriptionStatus>(["aktivna", "otkazana", "istekla"]);

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function refreshPlatform(slug?: string) {
  revalidatePath("/platform");
  revalidatePath("/platform/pretplate");
  revalidatePath("/platform/koriscenje");
  revalidatePath("/platform/paketi");
  revalidatePath("/platform/podrska");
  if (slug) {
    revalidatePath(`/shop/${slug}`);
    revalidatePath(`/shop/${slug}`, "layout");
  }
}

async function run(work: () => Promise<void>, slug?: string): Promise<PlatformState> {
  await requirePlatformSession();
  try {
    await work();
  } catch (error) {
    if (error instanceof DataError) return { error: error.message };
    throw error;
  }
  refreshPlatform(slug);
  return { error: "" };
}

export async function setOrganizationActiveAction(_prev: PlatformState, formData: FormData): Promise<PlatformState> {
  const organizationId = text(formData, "organizationId");
  const active = text(formData, "active") === "true";
  const slug = text(formData, "slug");
  return run(() => getCommerce().setOrganizationActive(organizationId, active), slug);
}

export async function updatePlanAction(_prev: PlatformState, formData: FormData): Promise<PlatformState> {
  const planId = text(formData, "planId");
  const name = text(formData, "name");
  const monthlyPricePara = parseRsdToPara(text(formData, "monthlyPrice"));
  if (monthlyPricePara == null) return { error: "Unesite mesečnu cenu u dinarima." };
  return run(() => getCommerce().updatePlan(planId, { name, monthlyPricePara }));
}

export async function updateSubscriptionAction(_prev: PlatformState, formData: FormData): Promise<PlatformState> {
  const organizationId = text(formData, "organizationId");
  const planId = text(formData, "planId");
  const status = text(formData, "status");
  if (!STATUSES.has(status as SubscriptionStatus)) return { error: "Status pretplate nije ispravan." };
  return run(() =>
    getCommerce().updateSubscription(organizationId, { planId, status: status as SubscriptionStatus }),
  );
}

export async function updateSupplierNoteAction(_prev: PlatformState, formData: FormData): Promise<PlatformState> {
  const organizationId = text(formData, "organizationId");
  return run(() => getCommerce().updateSupplierNote(organizationId, text(formData, "note")));
}
