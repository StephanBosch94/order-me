import { unitLabel } from "@/lib/constants";
import { formatQuantity } from "@/lib/format";
import type { Product, Unit } from "@/lib/data/types";

export type PricedLine = {
  productId: string;
  name: string;
  sku: string;
  unit: Unit;
  quantity: number;
  unitPricePara: number;
  lineTotalPara: number;
};

export function lineTotalPara(unitPricePara: number, quantity: number) {
  return Math.round(unitPricePara * quantity);
}

export function isFractionalUnit(unit: Unit) {
  return unit === "kilogram" || unit === "litar";
}

export function normalizeQuantity(quantity: number, unit: Unit) {
  if (!Number.isFinite(quantity)) return null;
  if (isFractionalUnit(unit)) {
    const rounded = Math.round(quantity * 1000) / 1000;
    if (rounded <= 0 || rounded > 9999) return null;
    return rounded;
  }
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 9999) return null;
  return quantity;
}

export function priceOrderLines(
  catalog: Product[],
  requested: { productId: string; quantity: number }[],
): { ok: true; items: PricedLine[]; subtotalPara: number } | { ok: false; message: string } {
  if (requested.length === 0) {
    return { ok: false, message: "Korpa je prazna." };
  }
  if (requested.length > 100) {
    return { ok: false, message: "Porudžbina može imati najviše 100 stavki." };
  }

  const merged = new Map<string, number>();
  for (const line of requested) {
    merged.set(line.productId, (merged.get(line.productId) ?? 0) + line.quantity);
  }

  const byId = new Map(catalog.map((product) => [product.id, product]));
  const items: PricedLine[] = [];

  for (const [productId, rawQuantity] of merged) {
    const product = byId.get(productId);
    if (!product || !product.active) {
      return {
        ok: false,
        message: "Jedan od proizvoda više nije dostupan. Osvežite stranicu i pokušajte ponovo.",
      };
    }

    const quantity = normalizeQuantity(rawQuantity, product.unit);
    if (quantity === null) {
      return {
        ok: false,
        message: `Količina za proizvod „${product.name}” nije ispravna.`,
      };
    }
    if (quantity < product.minQuantity) {
      return {
        ok: false,
        message: `Minimalna količina za „${product.name}” je ${formatQuantity(product.minQuantity)} ${unitLabel(product.unit).toLowerCase()}.`,
      };
    }

    const lineTotal = lineTotalPara(product.pricePara, quantity);
    items.push({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      quantity,
      unitPricePara: product.pricePara,
      lineTotalPara: lineTotal,
    });
  }

  const subtotalPara = items.reduce((sum, item) => sum + item.lineTotalPara, 0);
  return { ok: true, items, subtotalPara };
}
