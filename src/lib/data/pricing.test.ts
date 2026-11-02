import assert from "node:assert/strict";
import test from "node:test";

import { nextStockQuantities, priceOrderLines, stockDirectionForStatus } from "@/lib/data/pricing";
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
  salePricePara: null,
  imageUrl: null,
  imageUrls: [],
  active: true,
  minQuantity: 100,
  stockQuantity: 0,
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

test("charges the sale price when it is lower than the regular price", () => {
  const priced = priceOrderLines([{ ...product, salePricePara: 300 }], [{ productId: "p1", quantity: 100 }]);
  assert.equal(priced.ok, true);
  if (priced.ok) {
    assert.equal(priced.items[0]?.unitPricePara, 300);
    assert.equal(priced.subtotalPara, 30000);
  }

  const ignored = priceOrderLines([{ ...product, salePricePara: 450 }], [{ productId: "p1", quantity: 100 }]);
  assert.equal(ignored.ok, true);
  if (ignored.ok) assert.equal(ignored.items[0]?.unitPricePara, 450);
});

test("rejects an inactive or unknown product", () => {
  const result = priceOrderLines([{ ...product, active: false }], [{ productId: "p1", quantity: 100 }]);
  assert.equal(result.ok, false);
});

test("warehouse stock floors at zero and skips a line without a product", () => {
  const held = [{ id: "p1", unit: "komad" as const, stockQuantity: 2 }];
  assert.deepEqual(
    nextStockQuantities(
      held,
      [
        { productId: "p1", quantity: 5 },
        { productId: null, quantity: 3 },
      ],
      "reserve",
    ),
    [{ id: "p1", stockQuantity: 0 }],
  );
  assert.deepEqual(
    nextStockQuantities([{ ...held[0], stockQuantity: 0 }], [{ productId: "p1", quantity: 5 }], "release"),
    [{ id: "p1", stockQuantity: 5 }],
  );
  assert.equal(stockDirectionForStatus("nova", "potvrdjena"), null);
  assert.equal(stockDirectionForStatus("u_pripremi", "isporucena"), null);
  assert.equal(stockDirectionForStatus("potvrdjena", "otkazana"), "release");
  assert.equal(stockDirectionForStatus("otkazana", "otkazana"), null);
});
