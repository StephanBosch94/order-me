import assert from "node:assert/strict";
import test from "node:test";

import { isCompanyBuyer } from "@/lib/buyer";
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
  const butik = first.organizations.find((item) => item.slug === "butik-vera");
  const vera = first.users.find((item) => item.email === "vera@butikvera.rs");
  const ana = first.users.find((item) => item.email === "ana@gastrosupply.rs");
  assert.equal(vera?.kind, "supplier");
  assert.notEqual(vera?.id, ana?.id);
  assert.equal(first.members.some((item) => item.userId === vera?.id && item.organizationId === butik?.id && item.role === "owner"), true);
  assert.equal(first.organizations.find((item) => item.slug === "gastro-supply")?.audience, "pravna");
  assert.equal(butik?.audience, "fizicka");

  const marko = first.users.find((item) => item.email === "marko@restorandunav.rs");
  const jovana = first.users.find((item) => item.email === "jovana@butikvera.rs");
  assert.equal(marko?.kind, "buyer");
  assert.equal(marko?.mb, "20123456");
  assert.equal(marko?.postalCode, "11000");
  assert.equal(jovana?.kind, "buyer");
  assert.equal(
    isCompanyBuyer({ name: marko?.name ?? "", businessName: marko?.businessName ?? "", pib: marko?.pib ?? "" }),
    true,
  );
  assert.equal(
    isCompanyBuyer({ name: jovana?.name ?? "", businessName: jovana?.businessName ?? "", pib: jovana?.pib ?? "" }),
    false,
  );
  assert.equal(first.orders.some((order) => order.buyerUserId === marko?.id), true);
  assert.equal(first.orders.some((order) => order.buyerUserId === jovana?.id), true);
  assert.equal(
    first.orders.some((order) => order.buyerUserId === jovana?.id && order.number.endsWith("-0901")),
    true,
  );
});
