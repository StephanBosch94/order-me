import { unitLabel } from "@/lib/constants";
import { formatQuantity } from "@/lib/format";
import type { OrderStatus, Product, Unit } from "@/lib/data/types";

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

export function salePricePara(product: Pick<Product, "pricePara" | "salePricePara">) {
  const sale = product.salePricePara;
  if (sale == null || sale <= 0 || sale >= product.pricePara) return null;
  return sale;
}

export function effectivePricePara(product: Pick<Product, "pricePara" | "salePricePara">) {
  return salePricePara(product) ?? product.pricePara;
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

/** Warehouse stock uses the product unit and may be zero. */
export function normalizeStockQuantity(quantity: number, unit: Unit) {
  if (!Number.isFinite(quantity) || quantity < 0 || quantity > 999_999) return null;
  if (isFractionalUnit(unit)) return Math.round(quantity * 1000) / 1000;
  if (!Number.isInteger(quantity)) return null;
  return quantity;
}

export type StockDirection = "reserve" | "release";

/** Returning stock happens only when an order first becomes cancelled. */
export function stockDirectionForStatus(from: OrderStatus, to: OrderStatus): StockDirection | null {
  if (to === "otkazana" && from !== "otkazana") return "release";
  return null;
}

/**
 * Reserve subtracts ordered quantities and never goes below zero.
 * Release adds those quantities back. Lines without a product id are skipped.
 */
export function nextStockQuantities(
  products: Pick<Product, "id" | "unit" | "stockQuantity">[],
  lines: { productId: string | null; quantity: number }[],
  direction: StockDirection,
): { id: string; stockQuantity: number }[] {
  const quantityByProduct = new Map<string, number>();
  for (const line of lines) {
    if (!line.productId) continue;
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) continue;
    quantityByProduct.set(line.productId, (quantityByProduct.get(line.productId) ?? 0) + line.quantity);
  }

  const byId = new Map(products.map((product) => [product.id, product]));
  const updates: { id: string; stockQuantity: number }[] = [];
  for (const [productId, quantity] of quantityByProduct) {
    const product = byId.get(productId);
    if (!product) continue;
    const delta = direction === "reserve" ? -quantity : quantity;
    const floored = Math.max(0, product.stockQuantity + delta);
    const rounded = isFractionalUnit(product.unit) ? Math.round(floored * 1000) / 1000 : Math.trunc(floored);
    const stockQuantity = normalizeStockQuantity(Math.min(rounded, 999_999), product.unit);
    if (stockQuantity === null || stockQuantity === product.stockQuantity) continue;
    updates.push({ id: product.id, stockQuantity });
  }
  return updates;
}

export function priceOrderLines(
  catalog: Product[],
  requested: { productId: string; quantity: number }[],
  options?: { enforceMinimum?: boolean; allowInactive?: boolean },
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
    if (!product || (!options?.allowInactive && !product.active)) {
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
    if (options?.enforceMinimum !== false && quantity < product.minQuantity) {
      return {
        ok: false,
        message: `Minimalna količina za „${product.name}” je ${formatQuantity(product.minQuantity)} ${unitLabel(product.unit).toLowerCase()}.`,
      };
    }

    const unitPricePara = effectivePricePara(product);
    const lineTotal = lineTotalPara(unitPricePara, quantity);
    items.push({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      quantity,
      unitPricePara,
      lineTotalPara: lineTotal,
    });
  }

  const subtotalPara = items.reduce((sum, item) => sum + item.lineTotalPara, 0);
  return { ok: true, items, subtotalPara };
}
