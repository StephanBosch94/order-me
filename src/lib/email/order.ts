import "server-only";

import { getAppUrl } from "@/lib/config";
import type { EmailDelivery, OrderDetail, Organization, PublicSupplier } from "@/lib/data/types";
import { sendEmail } from "@/lib/email/send";
import { formatQuantity, formatRsd } from "@/lib/format";
import { paymentLabel, unitLabel } from "@/lib/constants";
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
    to: order.customerSnapshot.email,
    subject: `Potvrda porudžbine ${order.number}`,
    text: [
      `Porudžbina ${order.number} je primljena.`,
      `Dobavljač: ${supplier.name}`,
      "",
      lines,
      "",
      `Ukupno: ${formatRsd(order.totalPara)}`,
      order.paymentMethod ? `Način plaćanja: ${paymentLabel(order.paymentMethod)}` : "",
      "",
      "Ovo je potvrda porudžbine. Nije fiskalni račun ni faktura.",
      `PDF: ${pdfUrl}`,
    ].join("\n"),
    html: customerHtml(order, supplier, pdfUrl),
  }).catch(() => "failed" as const);

  const supplierStatus = organization.notificationEmail
    ? await sendEmail({
        to: organization.notificationEmail,
        subject: `Nova porudžbina ${order.number}`,
        text: [
          `${order.customerSnapshot.businessName} je poslala porudžbinu ${order.number}.`,
          `Kontakt: ${order.customerSnapshot.contactName}, ${order.customerSnapshot.phone}`,
          "",
          lines,
          "",
          `Ukupno: ${formatRsd(order.totalPara)}`,
          order.paymentMethod ? `Način plaćanja: ${paymentLabel(order.paymentMethod)}` : "",
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

function customerHtml(order: OrderDetail, supplier: PublicSupplier, pdfUrl: string) {
  const rows = order.items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(formatQuantity(item.quantity))} ${escapeHtml(unitLabel(item.unit).toLowerCase())}</td><td>${escapeHtml(formatRsd(item.lineTotalPara))}</td></tr>`,
    )
    .join("");
  const payment = order.paymentMethod
    ? `<p>Način plaćanja: ${escapeHtml(paymentLabel(order.paymentMethod))}</p>`
    : "";
  return `<div style="font-family:Arial,sans-serif;color:#18181b"><h1 style="font-size:20px">Potvrda porudžbine ${escapeHtml(order.number)}</h1><p>${escapeHtml(supplier.name)} je primio vašu porudžbinu.</p><table cellpadding="6">${rows}</table><p><strong>Ukupno: ${escapeHtml(formatRsd(order.totalPara))}</strong></p>${payment}<p>Ovo je potvrda porudžbine. Nije fiskalni račun ni faktura.</p><p><a href="${pdfUrl}">Preuzmite PDF</a></p></div>`;
}
