"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { partyForPib, paymentTermFor } from "@/lib/customers";
import { getCommerce } from "@/lib/data";
import { buildSalesInvoiceUbl } from "@/lib/efaktura/ubl";
import { postSalesInvoice, type EfakturaEnvironment } from "@/lib/efaktura/send";
import { addCalendarDays, belgradeDateKey } from "@/lib/format";

export type EfakturaActionResult = {
  ok: boolean;
  message: string;
  invoiceId?: string;
};

function environmentOf(value: string | undefined): EfakturaEnvironment {
  return value === "produkcija" ? "produkcija" : "demo";
}

export async function sendEfakturaAction(orderId: string): Promise<EfakturaActionResult> {
  try {
    const session = await requireSession();
    const commerce = getCommerce();
    const order = await commerce.getOrder(session.organization.id, orderId);
    if (!order) return { ok: false, message: "Porudžbina nije pronađena." };

    const customer = await commerce.getCustomer(session.organization.id, order.customerId);
    const party = customer?.party ?? partyForPib(order.customerSnapshot.pib);
    if (party !== "pravna") {
      return { ok: false, message: "E-faktura se šalje samo za pravna lica." };
    }

    const organization = await commerce.getOrganization(session.organization.id);
    if (!organization?.efakturaEnabled) {
      return { ok: false, message: "Slanje e-fakture nije uključeno u Podešavanjima." };
    }
    if (order.sefInvoiceId) {
      return {
        ok: true,
        invoiceId: order.sefInvoiceId,
        message: `E-faktura je već poslata. Identifikator: ${order.sefInvoiceId}`,
      };
    }

    const apiKey = organization.efakturaApiKey.trim();
    if (!apiKey) {
      return { ok: false, message: "API ključ za e-fakturu nije unet u Podešavanjima." };
    }

    const supplierPib = organization.pib.replace(/\D/g, "");
    const buyerPib = order.customerSnapshot.pib.replace(/\D/g, "");
    if (!/^\d{9}$/.test(supplierPib)) {
      return { ok: false, message: "PIB firme nije unet u Podešavanjima." };
    }
    if (!/^\d{9}$/.test(buyerPib)) {
      return { ok: false, message: "Kupac nema PIB, pa e-faktura nije poslata." };
    }
    if (!organization.city.trim() || !order.customerSnapshot.city.trim()) {
      return { ok: false, message: "Za e-fakturu nedostaje grad firme ili kupca." };
    }
    if (order.items.length === 0) {
      return { ok: false, message: "Porudžbina nema stavke." };
    }

    const days = paymentTermFor(party, customer?.paymentTermDays);
    const issueDate = belgradeDateKey(order.createdAt);
    const dueDate = belgradeDateKey(addCalendarDays(order.createdAt, days));
    const xml = buildSalesInvoiceUbl({
      number: order.number,
      issueDate,
      dueDate,
      deliveryDate: issueDate,
      supplier: {
        name: organization.name,
        pib: supplierPib,
        mb: organization.mb,
        address: organization.address,
        city: organization.city,
        postalCode: "",
        email: organization.email,
        phone: organization.phone,
      },
      customer: {
        name: order.customerSnapshot.businessName,
        pib: buyerPib,
        mb: order.customerSnapshot.mb,
        address: order.customerSnapshot.address,
        city: order.customerSnapshot.city,
        postalCode: order.customerSnapshot.postalCode,
        email: order.customerSnapshot.email,
        phone: order.customerSnapshot.phone,
      },
      lines: order.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        unit: item.unit,
        quantity: item.quantity,
        unitPricePara: item.unitPricePara,
        lineTotalPara: item.lineTotalPara,
      })),
    });

    const posted = await postSalesInvoice({
      environment: environmentOf(organization.efakturaEnvironment),
      apiKey,
      xml,
      requestId: randomUUID(),
    });
    if (!posted.ok) return posted;

    const saved = await commerce.saveSefInvoice(organization.id, order.id, {
      invoiceId: posted.invoiceId,
      status: "poslata",
    });
    const invoiceId = saved?.invoiceId ?? posted.invoiceId;
    revalidatePath(`/orders/${order.id}`);
    revalidatePath("/orders");
    return {
      ok: true,
      invoiceId,
      message: saved?.already
        ? `E-faktura je već poslata. Identifikator: ${invoiceId}`
        : `E-faktura je poslata. Identifikator: ${invoiceId}`,
    };
  } catch {
    return { ok: false, message: "E-faktura nije poslata. Pokušajte ponovo." };
  }
}
