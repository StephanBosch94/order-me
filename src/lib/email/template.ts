import { unitLabel } from "@/lib/constants";
import type { Unit } from "@/lib/data/types";
import { formatQuantity, formatRsd } from "@/lib/format";
import { escapeHtml } from "@/lib/text";

export type EmailLine = {
  name: string;
  quantity: number;
  unit: Unit;
  lineTotalPara: number;
};

/** Shop logos are stored as site paths. Mail clients only load an absolute address. */
export function emailLogoUrl(path: string | null | undefined, appUrl: string) {
  const value = path?.trim() ?? "";
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${appUrl.replace(/\/$/, "")}${value}`;
  return null;
}

export function vendroLogoUrl(appUrl: string) {
  return emailLogoUrl("/brand/vendro-logo.png", appUrl);
}

/** Black button shared by every mail that has an action. */
export function emailButton(href: string, label: string) {
  const safeUrl = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;border-collapse:separate">
    <tr>
      <td align="center" bgcolor="#111111" style="background-color:#111111;border-radius:12px">
        <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:16px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;background-color:#111111;border-radius:12px">${safeLabel}</a>
      </td>
    </tr>
  </table>`;
}

export function orderLinesText(items: EmailLine[]) {
  return items
    .map(
      (item) =>
        `${item.name} · ${formatQuantity(item.quantity)} ${unitLabel(item.unit).toLowerCase()} · ${formatRsd(item.lineTotalPara)}`,
    )
    .join("\n");
}

export function orderLinesHtml(items: EmailLine[], totalPara: number) {
  const rows = items
    .map(
      (item) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #e4e4e7;vertical-align:top">
          <div style="font-weight:600">${escapeHtml(item.name)}</div>
          <div style="color:#52525b;font-size:13px;margin-top:2px">${escapeHtml(formatQuantity(item.quantity))} ${escapeHtml(unitLabel(item.unit).toLowerCase())}</div>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e4e4e7;text-align:right;vertical-align:top;white-space:nowrap;font-weight:600">${escapeHtml(formatRsd(item.lineTotalPara))}</td>
      </tr>`,
    )
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0">${rows}<tr>
      <td style="padding:12px 0;font-weight:700">Ukupno</td>
      <td style="padding:12px 0;text-align:right;font-weight:700;white-space:nowrap">${escapeHtml(formatRsd(totalPara))}</td>
    </tr></table>`;
}

/** Shared mail: Vendro logo, white card, and the same button when the body includes one. */
export function emailDocument(input: { logoUrl: string; title: string; bodyHtml: string; appUrl: string; preheader?: string }) {
  const home = input.appUrl.replace(/\/$/, "");
  const host = escapeHtml(home.replace(/^https?:\/\//, ""));
  const logo = escapeHtml(input.logoUrl);
  const preheader = input.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(input.preheader)}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="sr">
<body style="margin:0;padding:0;background:#f4f4f5">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-collapse:collapse">
    <tr>
      <td align="center" style="padding:28px 12px">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:560px;background:#ffffff;border-radius:20px;border-collapse:separate;overflow:hidden">
          <tr>
            <td style="padding:28px 32px 0;font-family:Arial,sans-serif">
              <img src="${logo}" alt="Vendro" width="148" height="44" style="display:block;border:0;outline:none;width:148px;height:44px" />
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 32px;font-family:Arial,sans-serif;color:#18181b">
              <h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:700">${escapeHtml(input.title)}</h1>
              ${input.bodyHtml}
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;color:#71717a">Vendro · <a href="${escapeHtml(home)}" style="color:#71717a;text-decoration:underline">${host}</a></p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Staff invitation. The person chooses a password. The mail never contains one. */
export function staffInviteEmail(input: {
  name: string;
  shopName: string;
  roleLabel: string;
  inviteUrl: string;
  logoUrl: string;
  appUrl: string;
}) {
  const subject = `Pozivnica za ${input.shopName}`;
  const text = [
    `${input.name}, dobili ste pristup prodavnici ${input.shopName}.`,
    `Uloga: ${input.roleLabel}.`,
    "",
    "Napravite lozinku ovde:",
    input.inviteUrl,
    "",
    "Lozinku birate sami. Niko drugi je ne vidi.",
    "Posle toga ulazite u porudžbine i katalog te prodavnice.",
  ].join("\n");
  const safeUrl = escapeHtml(input.inviteUrl);
  const html = emailDocument({
    logoUrl: input.logoUrl,
    title: subject,
    appUrl: input.appUrl,
    preheader: `Napravite lozinku za ${input.shopName}.`,
    bodyHtml: `<p style="margin:16px 0 0;font-size:16px;line-height:1.55">${escapeHtml(input.name)}, dobili ste pristup prodavnici.</p>
              <p style="margin:8px 0 0;font-size:16px;line-height:1.55">Uloga: ${escapeHtml(input.roleLabel)}.</p>
              <p style="margin:8px 0 0;font-size:16px;line-height:1.55">Napravite lozinku. Lozinku birate sami i niko drugi je ne vidi.</p>
              ${emailButton(input.inviteUrl, "Napravite lozinku")}
              <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#71717a">Ako dugme ne radi, kopirajte ovu adresu u pregledač:</p>
              <p style="margin:6px 0 0;font-size:13px;line-height:1.5;word-break:break-all"><a href="${safeUrl}" style="color:#18181b">${safeUrl}</a></p>
              <p style="margin:22px 0 0;padding-top:18px;border-top:1px solid #e4e4e7;font-size:13px;line-height:1.5;color:#71717a">Posle toga ulazite u porudžbine i katalog te prodavnice.</p>`,
  });
  return { subject, text, html };
}

/** Registration confirmation. Same shell as the other mail, with a confirm button and no photo. */
export function signupConfirmationEmail(input: { name: string; confirmUrl: string; logoUrl: string; appUrl: string }) {
  const greeting = input.name.trim() ? `${input.name.trim()},` : "Zdravo,";
  const home = input.appUrl.replace(/\/$/, "");
  const subject = "Potvrdite email adresu";
  const text = [
    greeting,
    "",
    "Nalog na Vendro je otvoren. Potvrdite email adresu i odmah ulazite u aplikaciju.",
    "",
    input.confirmUrl,
    "",
    "Ako niste vi otvorili nalog, zanemarite ovu poruku.",
    "",
    `Vendro · ${home}`,
  ].join("\n");
  const safeUrl = escapeHtml(input.confirmUrl);
  const html = emailDocument({
    logoUrl: input.logoUrl,
    title: subject,
    appUrl: input.appUrl,
    preheader: "Potvrdite email adresu i odmah ulazite u Vendro.",
    bodyHtml: `<p style="margin:16px 0 0;font-size:16px;line-height:1.55">${escapeHtml(greeting)}</p>
              <p style="margin:8px 0 0;font-size:16px;line-height:1.55">Nalog na Vendro je otvoren. Potvrdite email adresu i odmah ulazite u aplikaciju.</p>
              ${emailButton(input.confirmUrl, "Potvrdite adresu")}
              <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#71717a">Ako dugme ne radi, kopirajte ovu adresu u pregledač:</p>
              <p style="margin:6px 0 0;font-size:13px;line-height:1.5;word-break:break-all"><a href="${safeUrl}" style="color:#18181b">${safeUrl}</a></p>
              <p style="margin:22px 0 0;padding-top:18px;border-top:1px solid #e4e4e7;font-size:13px;line-height:1.5;color:#71717a">Ako niste vi otvorili nalog, zanemarite ovu poruku.</p>`,
  });
  return { subject, text, html };
}
