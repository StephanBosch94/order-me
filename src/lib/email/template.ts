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

export function emailLogoHtml(name: string, logoUrl: string | null) {
  if (logoUrl) {
    return `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(name)}" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:8px;border:1px solid #e4e4e7;object-fit:contain;background:#ffffff" />`;
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return `<div style="width:48px;height:48px;line-height:48px;text-align:center;border-radius:8px;background:#18181b;color:#ffffff;font-weight:700;font-size:14px">${escapeHtml(initials || "P")}</div>`;
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

export function emailDocument(input: { name: string; logoUrl: string | null; title: string; bodyHtml: string }) {
  return `<div style="font-family:Arial,sans-serif;color:#18181b;background:#ffffff;max-width:560px">${emailLogoHtml(input.name, input.logoUrl)}<p style="margin:12px 0 0;font-size:14px;font-weight:600">${escapeHtml(input.name)}</p><h1 style="font-size:20px;line-height:1.3;margin:8px 0 0">${escapeHtml(input.title)}</h1>${input.bodyHtml}</div>`;
}
