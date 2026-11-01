import type { CSSProperties } from "react";

const HEX = /^#([0-9a-fA-F]{6})$/;

export function normalizeHex(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  return HEX.test(raw) ? `#${raw.slice(1).toLowerCase()}` : null;
}

export function contrastForeground(hex: string) {
  const color = normalizeHex(hex) ?? "#18181b";
  const channel = (start: number) => parseInt(color.slice(start, start + 2), 16) / 255;
  const linear = (value: number) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear(channel(1)) + 0.7152 * linear(channel(3)) + 0.0722 * linear(channel(5));
  return luminance > 0.42 ? "#18181b" : "#fafafa";
}

export function darkenHex(value: string | null | undefined, ratio = 0.82) {
  const hex = normalizeHex(value);
  if (!hex) return null;
  const channel = (start: number) =>
    Math.round(parseInt(hex.slice(start, start + 2), 16) * ratio)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

export function supplierTheme(color: string | null): CSSProperties {
  const hex = normalizeHex(color);
  if (!hex) return {};
  return {
    "--primary": hex,
    "--primary-hover": darkenHex(hex),
    "--primary-foreground": contrastForeground(hex),
    "--ring": hex,
  } as CSSProperties;
}
