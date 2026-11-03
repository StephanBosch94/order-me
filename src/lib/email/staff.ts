import "server-only";

import { getAppUrl } from "@/lib/config";
import type { EmailDelivery } from "@/lib/data/types";
import { sendEmail } from "@/lib/email/send";
import { escapeHtml } from "@/lib/text";

export async function deliverStaffInvite(input: {
  to: string;
  name: string;
  shopName: string;
  password: string;
  roleLabel: string;
}): Promise<EmailDelivery> {
  const loginUrl = `${getAppUrl()}/login`;
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
  const html = `<div style="font-family:Arial,sans-serif;color:#18181b"><h1 style="font-size:20px">Pozivnica za ${escapeHtml(input.shopName)}</h1><p>${escapeHtml(input.name)}, dobili ste pristup prodavnici.</p><p>Uloga: ${escapeHtml(input.roleLabel)}.</p><p><a href="${loginUrl}">Prijavite se</a></p><p>Email: ${escapeHtml(input.to)}<br>Početna lozinka: ${escapeHtml(input.password)}</p><p>Posle prijave vidite porudžbine i katalog te prodavnice.</p></div>`;
  return sendEmail({
    to: input.to,
    subject: `Pozivnica za ${input.shopName}`,
    text,
    html,
  }).catch(() => "failed" as const);
}
