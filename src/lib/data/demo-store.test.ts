import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { DemoStore } from "@/lib/data/demo-store";

async function withStore(run: (store: DemoStore) => Promise<void>) {
  const dir = await mkdtemp(path.join(tmpdir(), "poruci-"));
  const store = new DemoStore(path.join(dir, "db.json"), { seed: false });
  try {
    await run(store);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("isolates suppliers and keeps order snapshots", async () => {
  await withStore(async (store) => {
    const firstUser = await store.createUser({
      name: "Ana Petrović",
      email: "ana@example.com",
      password: "lozinka123",
    });
    const secondUser = await store.createUser({
      name: "Marko Jović",
      email: "marko@example.com",
      password: "lozinka123",
    });
    const first = await store.createOrganization({
      userId: firstUser.id,
      userName: firstUser.name,
      userEmail: firstUser.email,
      name: "Gastro Supply",
      slug: "gastro-supply",
      phone: "",
    });
    const second = await store.createOrganization({
      userId: secondUser.id,
      userName: secondUser.name,
      userEmail: secondUser.email,
      name: "Druga Firma",
      slug: "druga-firma",
      phone: "",
    });
    const product = await store.createProduct(first.id, {
      name: "Salvete",
      sku: "SV",
      description: "",
      categoryId: null,
      newCategory: "Ugostiteljstvo",
      unit: "paket",
      pricePara: 18900,
      minQuantity: 1,
      active: true,
    });

    const created = await store.createPublicOrder(
      {
        slug: "gastro-supply",
        idempotencyKey: crypto.randomUUID(),
        businessName: "Kafić Luna",
        contactName: "Jelena Ilić",
        email: "jelena@kaficluna.rs",
        phone: "+38164111222",
        pib: "",
        address: "Zmaj Jovina 12",
        city: "Novi Sad",
        notes: "Pre podne",
        items: [{ productId: product.id, quantity: 2 }],
      },
      "127.0.0.1",
    );
    assert.equal(created.ok, true);
    if (!created.ok) return;

    assert.equal(await store.getOrder(second.id, created.order.id), null);
    assert.deepEqual(await store.listProducts(second.id), []);
    assert.equal(await store.updateProduct(second.id, product.id, {
      name: "Tuđe",
      sku: "X",
      description: "",
      categoryId: null,
      newCategory: "",
      unit: "komad",
      pricePara: 1,
      minQuantity: 1,
      active: true,
    }), null);

    await store.updateProduct(first.id, product.id, {
      name: "Salvete nove",
      sku: "SV",
      description: "",
      categoryId: product.categoryId,
      newCategory: "",
      unit: "paket",
      pricePara: 20000,
      minQuantity: 1,
      active: true,
    });
    const historical = await store.getOrder(first.id, created.order.id);
    assert.equal(historical?.items[0]?.name, "Salvete");
    assert.equal(historical?.items[0]?.unitPricePara, 18900);

    const duplicate = await store.createPublicOrder(
      {
        slug: "gastro-supply",
        idempotencyKey: created.order.idempotencyKey,
        businessName: "Druga porudžbina",
        contactName: "Neko",
        email: "drugo@example.com",
        phone: "+38164111000",
        pib: "",
        address: "",
        city: "",
        notes: "",
        items: [{ productId: product.id, quantity: 9 }],
      },
      "127.0.0.1",
    );
    assert.equal(duplicate.ok, true);
    if (duplicate.ok) {
      assert.equal(duplicate.duplicate, true);
      assert.equal(duplicate.order.id, created.order.id);
    }

    const updated = await store.updateOrderStatus(first.id, created.order.id, "potvrdjena", "Ana Petrović");
    assert.equal(updated?.status, "potvrdjena");
    assert.equal(updated?.history.length, 2);
    assert.equal(await store.updateOrderStatus(second.id, created.order.id, "otkazana", "Marko"), null);

    const wrongSupplier = await store.getPublicCatalog("nepostojeca-firma");
    assert.equal(wrongSupplier, null);
  });
});
