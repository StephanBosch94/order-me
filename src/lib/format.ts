const TIME_ZONE = "Europe/Belgrade";

const WEEKDAYS: Record<string, string> = {
  Sun: "nedelja",
  Mon: "ponedeljak",
  Tue: "utorak",
  Wed: "sreda",
  Thu: "četvrtak",
  Fri: "petak",
  Sat: "subota",
};

const MONTHS = [
  "januar",
  "februar",
  "mart",
  "april",
  "maj",
  "jun",
  "jul",
  "avgust",
  "septembar",
  "oktobar",
  "novembar",
  "decembar",
];

function groupDigits(value: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatDecimal(value: number, fractionDigits: number) {
  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(fractionDigits);
  const [whole, fraction] = fixed.split(".");
  const grouped = `${groupDigits(whole)}${fraction ? `,${fraction}` : ""}`;
  return negative ? `-${grouped}` : grouped;
}

export function formatRsd(para: number) {
  return `${formatDecimal(para / 100, 2)} RSD`;
}

export function formatQuantity(value: number) {
  const rounded = Math.round(value * 1000) / 1000;
  const fixed = rounded.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  const [whole, fraction] = fixed.split(".");
  return `${groupDigits(whole)}${fraction ? `,${fraction}` : ""}`;
}

function belgradeParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = value("hour") === "24" ? "00" : value("hour");
  return {
    weekday: WEEKDAYS[value("weekday")] ?? "nedelja",
    day: value("day"),
    month: value("month"),
    monthName: MONTHS[Number(value("month")) - 1] ?? "",
    year: value("year"),
    hour,
    minute: value("minute"),
  };
}

export function formatDateTime(iso: string) {
  const parts = belgradeParts(new Date(iso));
  return `${parts.day}. ${parts.month}. ${parts.year}. ${parts.hour}:${parts.minute}`;
}

export function formatDate(iso: string) {
  const parts = belgradeParts(new Date(iso));
  return `${parts.day}. ${parts.month}. ${parts.year}.`;
}

export function formatLongDate(date = new Date()) {
  const parts = belgradeParts(date);
  return `${parts.weekday}, ${Number(parts.day)}. ${parts.monthName} ${parts.year}.`;
}

export function belgradeDateKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function belgradeYear(iso: string) {
  return belgradeDateKey(iso).slice(0, 4);
}

export function belgradeMonthKey(iso: string) {
  return belgradeDateKey(iso).slice(0, 7);
}

export function parseRsdToPara(input: string): number | null {
  const raw = input.trim().replace(/\s/g, "").replace(/rsd/gi, "");
  if (!raw) return null;

  let normalized = raw;
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");

  if (hasComma && hasDot) {
    if (raw.lastIndexOf(",") > raw.lastIndexOf(".")) {
      normalized = raw.replaceAll(".", "").replace(",", ".");
    } else {
      normalized = raw.replaceAll(",", "");
    }
  } else if (hasComma) {
    const parts = raw.split(",");
    normalized =
      parts.length === 2 && parts[1].length <= 2
        ? `${parts[0].replaceAll(".", "")}.${parts[1]}`
        : raw.replaceAll(",", "");
  } else if (hasDot) {
    const parts = raw.split(".");
    const last = parts.at(-1) ?? "";
    if (!(parts.length === 2 && last.length <= 2)) {
      normalized = raw.replaceAll(".", "");
    }
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || value > 100_000_000) return null;
  return Math.round(value * 100);
}

export function formatPriceInput(para: number) {
  return formatDecimal(para / 100, 2);
}
