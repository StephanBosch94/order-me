"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { getSession, requireSession } from "@/lib/auth";
import { getCommerce } from "@/lib/data";
import type { OrderStatus } from "@/lib/data/types";
import { deliverOrderEmails } from "@/lib/email/order";
import { customerSchema, fieldErrors, publicOrderSchema, retailOrderSchema, statusSchema } from "@/lib/validators";

export type OrderActionState = {
  ok: boolean;
  message?: string;
  token?: string;
  slug?: string;
  fieldErrors?: Record<string, string>;
};

export async function placeOrderAction(input: unknown): Promise<OrderActionState> {
  const parsed = publicOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Proverite unete podatke.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const catalog = await getCommerce().getPublicCatalog(parsed.data.slug);
  if (catalog?.supplier.channel === "b2c") {
    return { ok: false, message: "Ovo je internet prodavnica. Kupovina ide preko korpe." };
  }

  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "local";
  const session = await getSession();
  const result = await getCommerce().createPublicOrder(
    {
      slug: parsed.data.slug,
      idempotencyKey: parsed.data.idempotencyKey,
      businessName: parsed.data.businessName,
      contactName: parsed.data.contactName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      pib: parsed.data.pib,
      address: parsed.data.address,
      city: parsed.data.city,
      notes: parsed.data.notes,
      items: parsed.data.items,
      buyerUserId: session?.kind === "buyer" ? session.userId : null,
    },
    ip,
  );
  if (!result.ok) return { ok: false, message: result.message };

  if (!result.duplicate) {
    const organization = await getCommerce().getOrganization(result.order.organizationId);
    if (organization) {
      const delivery = await deliverOrderEmails(result.order, result.supplier, organization).catch(() => ({
        customer: "failed" as const,
        supplier: "failed" as const,
      }));
      await getCommerce().setEmailStatus(result.order.id, delivery.customer, delivery.supplier);
    }
    revalidatePath("/orders");
    revalidatePath("/dashboard");
    revalidatePath("/customers");
    revalidatePath("/kupac");
  }

  return { ok: true, token: result.order.confirmationToken, slug: result.supplier.slug };
}

export async function placeShopOrderAction(input: unknown): Promise<OrderActionState> {
  const parsed = retailOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Proverite unete podatke.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const catalog = await getCommerce().getPublicCatalog(parsed.data.slug);
  if (!catalog || catalog.supplier.channel !== "b2c") {
    return { ok: false, message: "Ova prodavnica nije pronađena." };
  }

  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "local";
  const result = await getCommerce().createPublicOrder(
    {
      slug: parsed.data.slug,
      idempotencyKey: parsed.data.idempotencyKey,
      businessName: parsed.data.customerName,
      contactName: parsed.data.customerName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      pib: "",
      address: parsed.data.address,
      city: parsed.data.city,
      notes: parsed.data.notes,
      items: parsed.data.items,
      buyerUserId: null,
    },
    ip,
  );
  if (!result.ok) return { ok: false, message: result.message };

  if (!result.duplicate) {
    const organization = await getCommerce().getOrganization(result.order.organizationId);
    if (organization) {
      const delivery = await deliverOrderEmails(result.order, result.supplier, organization).catch(() => ({
        customer: "failed" as const,
        supplier: "failed" as const,
      }));
      await getCommerce().setEmailStatus(result.order.id, delivery.customer, delivery.supplier);
    }
    revalidatePath("/orders");
    revalidatePath("/dashboard");
    revalidatePath("/customers");
  }

  return { ok: true, token: result.order.confirmationToken, slug: result.supplier.slug };
}

export async function updateOrderStatusAction(orderId: string, status: string) {
  const session = await requireSession();
  const parsed = statusSchema.safeParse({ status });
  if (!parsed.success) return { ok: false, message: "Izaberite status." };
  const order = await getCommerce().updateOrderStatus(
    session.organization.id,
    orderId,
    parsed.data.status as OrderStatus,
    session.name,
  );
  if (!order) return { ok: false, message: "Porudžbina nije pronađena." };
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Status porudžbine je ažuriran." };
}

export async function updateCustomerAction(customerId: string, formData: FormData) {
  const session = await requireSession();
  const parsed = customerSchema.safeParse({
    businessName: formData.get("businessName"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    pib: formData.get("pib") ?? "",
    address: formData.get("address") ?? "",
    city: formData.get("city") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Proverite podatke o kupcu." };
  }
  const customer = await getCommerce().updateCustomer(session.organization.id, customerId, parsed.data);
  if (!customer) return { ok: false, message: "Kupac nije pronađen." };
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  return { ok: true, message: "Podaci o kupcu su sačuvani." };
}
