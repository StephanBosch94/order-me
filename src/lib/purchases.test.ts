import assert from "node:assert/strict";
import test from "node:test";

import type { OrderedQuantity } from "@/lib/data/types";
import { purchasesForMonth } from "@/lib/purchases";

function line(patch: Partial<OrderedQuantity> & Pick<OrderedQuantity, "createdAt" | "quantity">): OrderedQuantity {
  return {
    status: "prihvacena",
    productId: "voda",
    name: "Kisela voda",
    unit: "komad",
    imageUrl: "/voda.jpg",
    ...patch,
  };
}

test("monthly purchases add the same article and keep its image", () => {
  const lines = purchasesForMonth(
    [
      line({ createdAt: "2026-11-02T10:00:00.000Z", quantity: 10 }),
      line({ createdAt: "2026-11-20T10:00:00.000Z", quantity: 14, imageUrl: null }),
      line({ createdAt: "2026-10-20T10:00:00.000Z", quantity: 100 }),
    ],
    "2026-11",
  );

  assert.deepEqual(lines, [
    { key: "voda", name: "Kisela voda", quantity: 24, unit: "komad", imageUrl: "/voda.jpg" },
  ]);
});
