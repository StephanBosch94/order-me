import "server-only";

import { getAppUrl } from "@/lib/config";
import type { EmailDelivery } from "@/lib/data/types";
import { accountMailRecipient } from "@/lib/demo-shops";
import { sendEmail } from "@/lib/email/send";
import { emailButton, emailDocument, vendroLogoUrl } from "@/lib/email/template";
import { escapeHtml } from "@/lib/text";

export async function deliverStaffInvite(input: {
  to: string;
  name: string;
  shopName: string;
  password: string;
  roleLabel: string;
}): Promise<EmailDelivery> {
  const appUrl = getAppUrl();
  const logoUrl = vendroLogoUrl(appUrl);
  if (!logoUrl) return "failed";
  const loginUrl = `${appUrl}/login`;
  const text = [
    `${input.name}, dobili ste pristup prodavnici ${input.shopName}.`,
    `Uloga: ${input.roleLabel}.`,
    "",
    `Prijavite se ovde: ${loginUrl}`,
    `Email: ${input.to}`,
    `Početna lozinka: ${input.password}`,
    "",
    "Posle prijave vidite porudžbine i katalog te prodavnice.",
  ].join("\n");
  const html = emailDocument({
    logoUrl,
    title: `Pozivnica za ${input.shopName}`,
    appUrl,
    bodyHtml: `<p style="margin:16px 0 0;font-size:16px;line-height:1.55">${escapeHtml(input.name)}, dobili ste pristup prodavnici.</p><p style="margin:8px 0 0;font-size:16px;line-height:1.55">Uloga: ${escapeHtml(input.roleLabel)}.</p>${emailButton(loginUrl, "Prijavite se")}<p style="margin:28px 0 0;font-size:16px;line-height:1.55">Email: ${escapeHtml(input.to)}<br>Početna lozinka: ${escapeHtml(input.password)}</p><p style="margin:8px 0 0;font-size:16px;line-height:1.55">Posle prijave vidite porudžbine i katalog te prodavnice.</p>`,
  });
  return sendEmail({
    to: accountMailRecipient(input.to),
    subject: `Pozivnica za ${input.shopName}`,
    text,
    html,
  }).catch(() => "failed" as const);
}
