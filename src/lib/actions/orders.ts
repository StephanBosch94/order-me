"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { getSession, requireSession } from "@/lib/auth";
import { isCompanyBuyer, normalizeBankAccount, normalizeMb, normalizePostalCode, orderConfirmationEmail } from "@/lib/buyer";
import { isBusinessStore, sellsToBusinesses } from "@/lib/constants";
import { getCommerce } from "@/lib/data";
import type { BuyerAccount, OrderStatus } from "@/lib/data/types";
import { deliverOrderEmails } from "@/lib/email/order";
import {
  businessOrderSchema,
  customerSchema,
  fieldErrors,
  publicOrderSchema,
  retailOrderSchema,
  statusSchema,
} from "@/lib/validators";

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
  if (catalog?.closedMessage) return { ok: false, message: catalog.closedMessage };
  if (catalog && !sellsToBusinesses(catalog.supplier.audience)) {
    return { ok: false, message: "Ova prodavnica prima kupovine fizičkih lica preko korpe." };
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
      mb: "",
      address: parsed.data.address,
      postalCode: "",
      city: parsed.data.city,
      notes: parsed.data.notes,
      items: parsed.data.items,
      buyerUserId: session?.kind === "buyer" ? session.userId : null,
      confirmationEmail: session?.kind === "buyer" ? orderConfirmationEmail(session) : "",
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
  const slug = typeof input === "object" && input && "slug" in input ? String(input.slug ?? "") : "";
  const preview = slug ? await getCommerce().getPublicCatalog(slug) : null;
  if (preview?.closedMessage) return { ok: false, message: preview.closedMessage };
  if (preview && isBusinessStore(preview.supplier.audience)) return placeBusinessOrder(input);

  const parsed = retailOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Proverite unete podatke.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const catalog = await getCommerce().getPublicCatalog(parsed.data.slug);
  if (!catalog) return { ok: false, message: "Prodavnica nije pronađena." };
  if (catalog.closedMessage) return { ok: false, message: catalog.closedMessage };

  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "local";
  const session = await getSession();
  const result = await getCommerce().createPublicOrder(
    {
      slug: parsed.data.slug,
      idempotencyKey: parsed.data.idempotencyKey,
      businessName: parsed.data.customerName,
      contactName: parsed.data.customerName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      pib: "",
      mb: "",
      address: parsed.data.address,
      postalCode: "",
      city: parsed.data.city,
      notes: parsed.data.notes,
      items: parsed.data.items,
      buyerUserId: session?.kind === "buyer" ? session.userId : null,
      paymentMethod: parsed.data.paymentMethod,
      confirmationEmail: session?.kind === "buyer" ? orderConfirmationEmail(session) : parsed.data.email,
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

async function placeBusinessOrder(input: unknown): Promise<OrderActionState> {
  const parsed = businessOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Proverite unete podatke.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const session = await getSession();
  const buyer = session?.kind === "buyer" && isCompanyBuyer(session) ? session : null;
  if (!buyer) return { ok: false, message: "Otvorite nalog firme da biste poručili." };

  const bankAccount = normalizeBankAccount(buyer.bankAccount ?? "") ?? "";

  const mb = normalizeMb(buyer.mb) ?? normalizeMb(parsed.data.mb ?? "");
  const postalCode = normalizePostalCode(buyer.postalCode) ?? normalizePostalCode(parsed.data.postalCode ?? "");
  if (!mb) {
    return { ok: false, message: "Unesite matični broj od 8 cifara.", fieldErrors: { mb: "Matični broj ima 8 cifara." } };
  }
  if (!postalCode) {
    return {
      ok: false,
      message: "Unesite poštanski broj od 5 cifara.",
      fieldErrors: { postalCode: "Poštanski broj ima 5 cifara." },
    };
  }
  if (mb !== buyer.mb || postalCode !== buyer.postalCode) {
    await getCommerce().saveBuyerCompanyDetails(buyer.userId, { mb, postalCode });
  }

  return finishShopOrder({ ...buyer, mb, postalCode }, bankAccount, parsed.data);
}

async function finishShopOrder(
  buyer: BuyerAccount,
  bankAccount: string,
  data: { slug: string; idempotencyKey: string; notes: string; items: { productId: string; quantity: number }[] },
): Promise<OrderActionState> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "local";
  const result = await getCommerce().createPublicOrder(
    {
      slug: data.slug,
      idempotencyKey: data.idempotencyKey,
      businessName: buyer.businessName,
      contactName: buyer.name,
      email: buyer.email,
      phone: buyer.phone,
      pib: buyer.pib,
      mb: buyer.mb,
      address: buyer.address,
      postalCode: buyer.postalCode,
      city: buyer.city,
      notes: data.notes,
      items: data.items,
      buyerUserId: buyer.userId,
      paymentMethod: "racun",
      bankAccount,
      confirmationEmail: orderConfirmationEmail(buyer),
    },
    ip,
  );
  if (!result.ok) return { ok: false, message: result.message };
  if (!result.duplicate) await deliver(result);
  return { ok: true, token: result.order.confirmationToken, slug: result.supplier.slug };
}

async function deliver(result: {
  order: Parameters<typeof deliverOrderEmails>[0];
  supplier: Parameters<typeof deliverOrderEmails>[1];
}) {
  const organization = await getCommerce().getOrganization(result.order.organizationId);
  if (!organization) return;
  const delivery = await deliverOrderEmails(result.order, result.supplier, organization).catch(() => ({
    customer: "failed" as const,
    supplier: "failed" as const,
  }));
  await getCommerce().setEmailStatus(result.order.id, delivery.customer, delivery.supplier);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/customers");
  revalidatePath("/kupac");
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
