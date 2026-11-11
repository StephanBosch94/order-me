import type { OrderedQuantity, Unit } from "@/lib/data/types";
import { belgradeMonthKey, currentBelgradeMonthKey } from "@/lib/format";

export type PurchaseLine = {
  key: string;
  name: string;
  quantity: number;
  unit: Unit;
  imageUrl: string | null;
};

export function purchaseMonths(lines: OrderedQuantity[], now = new Date()) {
  const keys = new Set<string>([currentBelgradeMonthKey(now)]);
  for (const line of lines) {
    keys.add(belgradeMonthKey(line.createdAt));
  }
  return [...keys].sort((left, right) => right.localeCompare(left));
}

export function purchasesForMonth(lines: OrderedQuantity[], month: string): PurchaseLine[] {
  const totals = new Map<string, PurchaseLine>();
  for (const line of lines) {
    if (belgradeMonthKey(line.createdAt) !== month) continue;
    const key = line.productId ?? line.name;
    const existing = totals.get(key);
    if (existing) {
      existing.quantity = Math.round((existing.quantity + line.quantity) * 1000) / 1000;
      if (!existing.imageUrl && line.imageUrl) existing.imageUrl = line.imageUrl;
      continue;
    }
    totals.set(key, {
      key,
      name: line.name,
      quantity: line.quantity,
      unit: line.unit,
      imageUrl: line.imageUrl,
    });
  }
  return [...totals.values()].sort(
    (left, right) => right.quantity - left.quantity || left.name.localeCompare(right.name, "sr"),
  );
}
