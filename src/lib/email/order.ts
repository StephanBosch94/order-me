import "server-only";

import { orderConfirmationEmail } from "@/lib/buyer";
import { getAppUrl } from "@/lib/config";
import { paymentLabel, statusLabel } from "@/lib/constants";
import { publicConfirmationUrl } from "@/lib/store-host";
import type { EmailDelivery, OrderDetail, OrderStatus, Organization, PublicSupplier } from "@/lib/data/types";
import { mailRecipient } from "@/lib/demo-shops";
import { sendEmail } from "@/lib/email/send";
import { emailDocument, emailLogoUrl, orderLinesHtml, orderLinesText } from "@/lib/email/template";
import { formatRsd } from "@/lib/format";
import { formatIpsAccount } from "@/lib/ips";
import { escapeHtml } from "@/lib/text";

export async function deliverOrderEmails(
  order: OrderDetail,
  supplier: PublicSupplier,
  organization: Organization,
): Promise<{ customer: EmailDelivery; supplier: EmailDelivery }> {
  const appUrl = getAppUrl();
  const pdfUrl = `${appUrl}/api/confirmations/${order.confirmationToken}/pdf`;
  const orderUrl = publicConfirmationUrl(organization.slug, order.confirmationToken) ?? `${appUrl}/orders/${order.id}`;
  const logoUrl = emailLogoUrl(supplier.logoUrl, appUrl);
  const lines = orderLinesText(order.items);

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
      ...paymentLines(order, supplier),
      "",
      "Ovo je potvrda porudžbine. Nije fiskalni račun ni faktura.",
      `PDF: ${pdfUrl}`,
    ].join("\n"),
    html: customerHtml(order, supplier, pdfUrl, logoUrl),
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
          ...paymentLines(order, supplier),
          order.notes ? `Napomena: ${order.notes}` : "",
          "",
          orderUrl,
        ]
          .filter(Boolean)
          .join("\n"),
        html: supplierHtml(order, supplier, orderUrl, logoUrl),
      }).catch(() => "failed" as const)
    : "skipped";

  return { customer, supplier: supplierStatus };
}

export async function deliverOrderStatusEmail(
  order: OrderDetail,
  supplier: Pick<PublicSupplier, "name" | "slug" | "logoUrl">,
): Promise<EmailDelivery> {
  if (order.status === "nova") return "skipped";
  const to = mailRecipient(supplier.slug, orderConfirmationEmail(order.customerSnapshot));
  if (!to) return "skipped";
  const label = statusLabel(order.status);
  const appUrl = getAppUrl();
  const url = publicConfirmationUrl(supplier.slug, order.confirmationToken) ?? "";
  const lead = statusLead(order.status, order.number, supplier.name);
  const lines = orderLinesText(order.items);
  const text = [lead, "", lines, "", `Ukupno: ${formatRsd(order.totalPara)}`, url ? `Porudžbina: ${url}` : ""]
    .filter(Boolean)
    .join("\n");
  const html = emailDocument({
    name: supplier.name,
    logoUrl: emailLogoUrl(supplier.logoUrl, appUrl),
    title: label,
    bodyHtml: `<p style="margin:12px 0 0">${escapeHtml(lead)}</p>${orderLinesHtml(order.items, order.totalPara)}${url ? `<p style="margin:16px 0 0"><a href="${url}">Otvorite porudžbinu</a></p>` : ""}`,
  });
  return sendEmail({
    to,
    subject: `Porudžbina ${order.number} je ${statusPhrase(order.status)}`,
    text,
    html,
  }).catch(() => "failed" as const);
}

function statusPhrase(status: OrderStatus) {
  if (status === "prihvacena") return "prihvaćena";
  return statusLabel(status).toLowerCase();
}

function statusLead(status: OrderStatus, number: string, supplier: string) {
  return `${supplier}: porudžbina ${number} je ${statusPhrase(status)}.`;
}

function paymentLines(order: OrderDetail, supplier: PublicSupplier) {
  return [
    order.paymentMethod && order.paymentMethod !== "racun" ? `Način plaćanja: ${paymentLabel(order.paymentMethod)}` : "",
    order.paymentMethod === "ips" && supplier.ipsAccount ? `IPS račun: ${formatIpsAccount(supplier.ipsAccount)}` : "",
    order.customerSnapshot.bankAccount ? `Račun: ${order.customerSnapshot.bankAccount}` : "",
  ].filter(Boolean);
}

function customerHtml(order: OrderDetail, supplier: PublicSupplier, pdfUrl: string, logoUrl: string | null) {
  const payment = paymentLines(order, supplier)
    .map((line) => `<p style="margin:8px 0 0">${escapeHtml(line)}</p>`)
    .join("");
  return emailDocument({
    name: supplier.name,
    logoUrl,
    title: `Potvrda porudžbine ${order.number}`,
    bodyHtml: `<p style="margin:12px 0 0">${escapeHtml(supplier.name)} je primio vašu porudžbinu.</p>${orderLinesHtml(order.items, order.totalPara)}${payment}<p style="margin:16px 0 0">Ovo je potvrda porudžbine. Nije fiskalni račun ni faktura.</p><p style="margin:16px 0 0"><a href="${pdfUrl}">Preuzmite PDF</a></p>`,
  });
}

function supplierHtml(order: OrderDetail, supplier: PublicSupplier, adminUrl: string, logoUrl: string | null) {
  const payment = [
    ...paymentLines(order, supplier),
    order.notes ? `Napomena: ${order.notes}` : "",
  ]
    .filter(Boolean)
    .map((line) => `<p style="margin:8px 0 0">${escapeHtml(line)}</p>`)
    .join("");
  return emailDocument({
    name: supplier.name,
    logoUrl,
    title: `Nova porudžbina ${order.number}`,
    bodyHtml: `<p style="margin:12px 0 0"><strong>${escapeHtml(order.customerSnapshot.businessName)}</strong> je poslala porudžbinu ${escapeHtml(order.number)}.</p>${orderLinesHtml(order.items, order.totalPara)}${payment}<p style="margin:16px 0 0"><a href="${adminUrl}">Otvorite porudžbinu</a></p>`,
  });
}
