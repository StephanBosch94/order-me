import "server-only";

import type { EmailDelivery } from "@/lib/data/types";
import { accountMailRecipient } from "@/lib/demo-shops";
import { sendEmail } from "@/lib/email/send";
import { escapeHtml } from "@/lib/text";

export async function deliverPasswordChangedEmail(input: { to: string; name: string }): Promise<EmailDelivery> {
  const text = [
    `${input.name}, lozinka za nalog ${input.to} je upravo promenjena.`,
    "",
    "Ako to niste bili vi, prijavite se i vratite lozinku koju samo vi znate.",
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;color:#18181b"><h1 style="font-size:20px">Lozinka je promenjena</h1><p>${escapeHtml(input.name)}, lozinka za nalog ${escapeHtml(input.to)} je upravo promenjena.</p><p>Ako to niste bili vi, prijavite se i vratite lozinku koju samo vi znate.</p></div>`;
  return sendEmail({
    to: accountMailRecipient(input.to),
    subject: "Lozinka je promenjena",
    text,
    html,
  }).catch(() => "failed" as const);
}
