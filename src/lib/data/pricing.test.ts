import assert from "node:assert/strict";
import test from "node:test";

import { priceOrderLines } from "@/lib/data/pricing";
import type { Product } from "@/lib/data/types";

const product: Product = {
  id: "p1",
  organizationId: "org",
  categoryId: null,
  name: "Papirna čaša",
  sku: "PC",
  description: "",
  unit: "komad",
  pricePara: 450,
  imageUrl: null,
  active: true,
  minQuantity: 100,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test("uses the catalog price and enforces the minimum quantity", () => {
  const below = priceOrderLines([product], [{ productId: "p1", quantity: 10 }]);
  assert.equal(below.ok, false);

  const priced = priceOrderLines([product], [{ productId: "p1", quantity: 100 }]);
  assert.equal(priced.ok, true);
  if (priced.ok) {
    assert.equal(priced.items[0]?.unitPricePara, 450);
    assert.equal(priced.subtotalPara, 45000);
  }
});

test("rejects an inactive or unknown product", () => {
  const result = priceOrderLines([{ ...product, active: false }], [{ productId: "p1", quantity: 100 }]);
  assert.equal(result.ok, false);
});
