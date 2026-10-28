const FOLD: Record<string, string> = {
  č: "c",
  ć: "c",
  š: "s",
  ž: "z",
  đ: "dj",
  Č: "c",
  Ć: "c",
  Š: "s",
  Ž: "z",
  Đ: "dj",
};

export function fold(value: string) {
  return value
    .split("")
    .map((char) => FOLD[char] ?? char)
    .join("")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function slugify(value: string) {
  return fold(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function orderPrefixFromName(name: string) {
  const words = name
    .split(/\s+/)
    .map((word) => slugify(word))
    .filter(Boolean);
  const initials = words
    .map((word) => word[0] ?? "")
    .join("")
    .slice(0, 4)
    .toUpperCase();
  if (initials.length >= 2) return initials;
  return (words[0] ?? "por").slice(0, 4).toUpperCase() || "POR";
}

export function safeNextPath(value: string | null | undefined) {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return "/dashboard";
  }
  return value;
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
