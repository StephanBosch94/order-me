"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { getSession, requireSession } from "@/lib/auth";
import { isCompanyBuyer, normalizeBankAccount, normalizeMb, normalizePostalCode, orderConfirmationEmail } from "@/lib/buyer";
import { isBusinessStore, sellsToBusinesses } from "@/lib/constants";
import { parseCustomerCsv } from "@/lib/csv";
import { getCommerce } from "@/lib/data";
import { DataError } from "@/lib/errors";
import type { BuyerAccount, OrderStatus } from "@/lib/data/types";
import { deliverOrderEmails } from "@/lib/email/order";
import {
  businessOrderSchema,
  customerSchema,
  newCustomerSchema,
  staffOrderSchema,
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
  const session = await getSession();
  const accountCompany = session?.kind === "buyer" && isCompanyBuyer(session);
  if (
    preview &&
    (isBusinessStore(preview.supplier.audience) || (preview.supplier.audience === "oba" && accountCompany))
  ) {
    return placeBusinessOrder(input);
  }

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
  if (parsed.data.company && !sellsToBusinesses(catalog.supplier.audience)) {
    return { ok: false, message: "Ova prodavnica prima kupovine fizičkih lica." };
  }
  if (session?.kind === "buyer" && catalog.supplier.audience === "oba" && !accountCompany && parsed.data.company) {
    return { ok: false, message: "Ovaj nalog kupuje kao fizičko lice." };
  }

  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "local";
  const result = await getCommerce().createPublicOrder(
    {
      slug: parsed.data.slug,
      idempotencyKey: parsed.data.idempotencyKey,
      businessName: parsed.data.company ? (parsed.data.businessName ?? "").trim() : parsed.data.customerName,
      contactName: parsed.data.customerName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      pib: parsed.data.company ? (parsed.data.pib ?? "").replace(/\D/g, "") : "",
      mb: parsed.data.company ? (normalizeMb(parsed.data.mb ?? "") ?? "") : "",
      address: parsed.data.address,
      postalCode: normalizePostalCode(parsed.data.postalCode) ?? "",
      city: parsed.data.city,
      notes: parsed.data.notes,
      items: parsed.data.items,
      buyerUserId: session?.kind === "buyer" ? session.userId : null,
      paymentMethod: parsed.data.company ? "racun" : parsed.data.paymentMethod,
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
    party: formData.get("party"),
    paymentTermDays: formData.get("paymentTermDays") ?? "",
    code: formData.get("code") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Proverite podatke o kupcu." };
  }
  let customer;
  try {
    customer = await getCommerce().updateCustomer(session.organization.id, customerId, parsed.data);
  } catch (error) {
    if (error instanceof DataError) return { ok: false, message: error.message };
    throw error;
  }
  if (!customer) return { ok: false, message: "Kupac nije pronađen." };
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  return { ok: true, message: "Podaci o kupcu su sačuvani." };
}

export async function createCustomerAction(formData: FormData) {
  const session = await requireSession();
  const parsed = newCustomerSchema.safeParse({
    businessName: formData.get("businessName"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    pib: formData.get("pib") ?? "",
    address: formData.get("address") ?? "",
    city: formData.get("city") ?? "",
    notes: formData.get("notes") ?? "",
    party: formData.get("party"),
    paymentTermDays: formData.get("paymentTermDays") ?? "",
    code: formData.get("code") ?? "",
  });
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Proverite podatke o kupcu." };
  }
  try {
    const customer = await getCommerce().createCustomer(session.organization.id, parsed.data);
    revalidatePath("/customers");
    return { ok: true as const, message: "Kupac je dodat.", id: customer.id };
  } catch (error) {
    if (error instanceof DataError) return { ok: false as const, message: error.message };
    throw error;
  }
}

export async function importCustomersAction(csvText: string) {
  const session = await requireSession();
  const parsed = parseCustomerCsv(csvText);
  if (parsed.rows.length === 0) {
    return { ok: false as const, error: parsed.errors[0]?.message ?? "Nijedan kupac nije prepoznat." };
  }
  const result = await getCommerce().importCustomers(session.organization.id, parsed.rows);
  revalidatePath("/customers");
  const skipped = [...parsed.errors, ...result.errors];
  const label = customerCountLabel(result.created);
  return {
    ok: true as const,
    created: result.created,
    message:
      skipped.length > 0
        ? `Uvezeno je ${result.created} ${label}. Preskočeno redova: ${skipped.length}.`
        : `Uvezeno je ${result.created} ${label}.`,
  };
}

function customerCountLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "kupac";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "kupca";
  return "kupaca";
}

export async function createStaffOrderAction(input: {
  customerId: string;
  notes: string;
  items: { productId: string; quantity: number }[];
}) {
  const session = await requireSession();
  const parsed = staffOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Proverite porudžbinu." };
  }
  const result = await getCommerce().createStaffOrder(session.organization.id, {
    ...parsed.data,
    actorName: session.name,
  });
  if (!result.ok) return { ok: false as const, message: result.message };

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
  revalidatePath(`/customers/${parsed.data.customerId}`);
  return { ok: true as const, message: "Porudžbina je sačuvana.", id: result.order.id };
}
