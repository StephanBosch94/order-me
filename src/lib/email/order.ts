import "server-only";

import { orderConfirmationEmail } from "@/lib/buyer";
import { getAppUrl } from "@/lib/config";
import { confirmationPath, paymentLabel, statusLabel, unitLabel } from "@/lib/constants";
import type { EmailDelivery, OrderDetail, OrderStatus, Organization, PublicSupplier } from "@/lib/data/types";
import { mailRecipient } from "@/lib/demo-shops";
import { sendEmail } from "@/lib/email/send";
import { formatQuantity, formatRsd } from "@/lib/format";
import { escapeHtml } from "@/lib/text";

export async function deliverOrderEmails(
  order: OrderDetail,
  supplier: PublicSupplier,
  organization: Organization,
): Promise<{ customer: EmailDelivery; supplier: EmailDelivery }> {
  const pdfUrl = `${getAppUrl()}/api/confirmations/${order.confirmationToken}/pdf`;
  const adminUrl = `${getAppUrl()}/orders/${order.id}`;
  const lines = order.items
    .map(
      (item) =>
        `${item.name} · ${formatQuantity(item.quantity)} ${unitLabel(item.unit).toLowerCase()} · ${formatRsd(item.lineTotalPara)}`,
    )
    .join("\n");

  const customer = await sendEmail({
    to: mailRecipient(organization.slug, orderConfirmationEmail(order.customerSnapshot)),
    subject: `Potvrda porudžbine ${order.number}`,
    text: [
      `Porudžbina ${order.number} je primljena.`,
      `Dobavljač: ${supplier.name}`,
      "",
      lines,
      "",
      `Ukupno: ${formatRsd(order.totalPara)}`,
      order.paymentMethod && order.paymentMethod !== "racun" ? `Način plaćanja: ${paymentLabel(order.paymentMethod)}` : "",
      order.customerSnapshot.bankAccount ? `Račun: ${order.customerSnapshot.bankAccount}` : "",
      "",
      "Ovo je potvrda porudžbine. Nije fiskalni račun ni faktura.",
      `PDF: ${pdfUrl}`,
    ].join("\n"),
    html: customerHtml(order, supplier, pdfUrl),
  }).catch(() => "failed" as const);

  const supplierTo = mailRecipient(organization.slug, organization.notificationEmail);
  const supplierStatus = supplierTo
    ? await sendEmail({
        to: supplierTo,
        subject: `Nova porudžbina ${order.number}`,
        text: [
          `${order.customerSnapshot.businessName} je poslala porudžbinu ${order.number}.`,
          `Kontakt: ${order.customerSnapshot.contactName}, ${order.customerSnapshot.phone}`,
          order.customerSnapshot.mb ? `Matični broj: ${order.customerSnapshot.mb}` : "",
          order.customerSnapshot.pib ? `PIB: ${order.customerSnapshot.pib}` : "",
          order.customerSnapshot.postalCode ? `Poštanski broj: ${order.customerSnapshot.postalCode}` : "",
          "",
          lines,
          "",
          `Ukupno: ${formatRsd(order.totalPara)}`,
          order.paymentMethod && order.paymentMethod !== "racun" ? `Način plaćanja: ${paymentLabel(order.paymentMethod)}` : "",
          order.customerSnapshot.bankAccount ? `Račun: ${order.customerSnapshot.bankAccount}` : "",
          order.notes ? `Napomena: ${order.notes}` : "",
          "",
          adminUrl,
        ]
          .filter(Boolean)
          .join("\n"),
        html: `<p><strong>${escapeHtml(order.customerSnapshot.businessName)}</strong> je poslala porudžbinu ${escapeHtml(order.number)}.</p><p>Ukupno: ${escapeHtml(formatRsd(order.totalPara))}</p><p><a href="${adminUrl}">Otvorite porudžbinu</a></p>`,
      }).catch(() => "failed" as const)
    : "skipped";

  return { customer, supplier: supplierStatus };
}

export async function deliverOrderStatusEmail(
  order: OrderDetail,
  supplier: Pick<PublicSupplier, "name" | "slug">,
): Promise<EmailDelivery> {
  if (order.status === "nova") return "skipped";
  const to = mailRecipient(supplier.slug, orderConfirmationEmail(order.customerSnapshot));
  if (!to) return "skipped";
  const label = statusLabel(order.status);
  const path = confirmationPath(supplier.slug, order.confirmationToken);
  const url = path ? `${getAppUrl()}${path}` : "";
  const lead = statusLead(order.status, order.number, supplier.name);
  const text = [lead, "", `Ukupno: ${formatRsd(order.totalPara)}`, url ? `Porudžbina: ${url}` : ""]
    .filter(Boolean)
    .join("\n");
  return sendEmail({
    to,
    subject: `Porudžbina ${order.number} je ${statusPhrase(order.status)}`,
    text,
    html: `<div style="font-family:Arial,sans-serif;color:#18181b"><h1 style="font-size:20px">${escapeHtml(label)}</h1><p>${escapeHtml(lead)}</p><p><strong>Ukupno: ${escapeHtml(formatRsd(order.totalPara))}</strong></p>${url ? `<p><a href="${url}">Otvorite porudžbinu</a></p>` : ""}</div>`,
  }).catch(() => "failed" as const);
}

function statusPhrase(status: OrderStatus) {
  if (status === "potvrdjena") return "potvrđena";
  if (status === "u_pripremi") return "u pripremi";
  if (status === "isporucena") return "isporučena";
  if (status === "otkazana") return "otkazana";
  return statusLabel(status).toLowerCase();
}

function statusLead(status: OrderStatus, number: string, supplier: string) {
  return `${supplier}: porudžbina ${number} je ${statusPhrase(status)}.`;
}

function customerHtml(order: OrderDetail, supplier: PublicSupplier, pdfUrl: string) {
  const rows = order.items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(formatQuantity(item.quantity))} ${escapeHtml(unitLabel(item.unit).toLowerCase())}</td><td>${escapeHtml(formatRsd(item.lineTotalPara))}</td></tr>`,
    )
    .join("");
  const payment = [
    order.paymentMethod && order.paymentMethod !== "racun" ? `Način plaćanja: ${paymentLabel(order.paymentMethod)}` : "",
    order.customerSnapshot.bankAccount ? `Račun: ${order.customerSnapshot.bankAccount}` : "",
  ]
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
  return `<div style="font-family:Arial,sans-serif;color:#18181b"><h1 style="font-size:20px">Potvrda porudžbine ${escapeHtml(order.number)}</h1><p>${escapeHtml(supplier.name)} je primio vašu porudžbinu.</p><table cellpadding="6">${rows}</table><p><strong>Ukupno: ${escapeHtml(formatRsd(order.totalPara))}</strong></p>${payment}<p>Ovo je potvrda porudžbine. Nije fiskalni račun ni faktura.</p><p><a href="${pdfUrl}">Preuzmite PDF</a></p></div>`;
}
