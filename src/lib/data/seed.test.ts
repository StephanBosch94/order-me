import assert from "node:assert/strict";
import test from "node:test";

import { createSeedDatabase } from "@/lib/data/seed";

test("demo catalog ids stay the same on every seed", async () => {
  const first = await createSeedDatabase();
  const second = await createSeedDatabase();
  const dress = (db: Awaited<ReturnType<typeof createSeedDatabase>>) =>
    db.products.find((product) => product.sku === "BV-HALJ");
  const box = (db: Awaited<ReturnType<typeof createSeedDatabase>>) =>
    db.products.find((product) => product.sku === "KB-4030");
  assert.equal(dress(first)?.id, dress(second)?.id);
  assert.equal(box(first)?.id, box(second)?.id);
  assert.equal(first.organizations.find((item) => item.slug === "butik-vera")?.id, second.organizations.find((item) => item.slug === "butik-vera")?.id);
});
