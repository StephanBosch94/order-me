import "server-only";

import { getAppUrl } from "@/lib/config";
import type { EmailDelivery } from "@/lib/data/types";
import { accountMailRecipient } from "@/lib/demo-shops";
import { sendEmail } from "@/lib/email/send";
import { emailDocument, vendroLogoUrl } from "@/lib/email/template";
import { escapeHtml } from "@/lib/text";

export async function deliverPasswordChangedEmail(input: { to: string; name: string }): Promise<EmailDelivery> {
  const appUrl = getAppUrl();
  const logoUrl = vendroLogoUrl(appUrl);
  if (!logoUrl) return "failed";
  const text = [
    `${input.name}, lozinka za nalog ${input.to} je upravo promenjena.`,
    "",
    "Ako to niste bili vi, prijavite se i vratite lozinku koju samo vi znate.",
  ].join("\n");
  const html = emailDocument({
    logoUrl,
    title: "Lozinka je promenjena",
    appUrl,
    bodyHtml: `<p style="margin:16px 0 0;font-size:16px;line-height:1.55">${escapeHtml(input.name)}, lozinka za nalog ${escapeHtml(input.to)} je upravo promenjena.</p><p style="margin:8px 0 0;font-size:16px;line-height:1.55">Ako to niste bili vi, prijavite se i vratite lozinku koju samo vi znate.</p>`,
  });
  return sendEmail({
    to: accountMailRecipient(input.to),
    subject: "Lozinka je promenjena",
    text,
    html,
  }).catch(() => "failed" as const);
}
