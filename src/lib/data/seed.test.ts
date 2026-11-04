import assert from "node:assert/strict";
import test from "node:test";

import { isCompanyBuyer } from "@/lib/buyer";
import { createSeedDatabase, ensureRetailDemo } from "@/lib/data/seed";

test("demo catalog ids stay the same on every seed", async () => {
  const first = await createSeedDatabase();
  const second = await createSeedDatabase();
  const dress = (db: Awaited<ReturnType<typeof createSeedDatabase>>) =>
    db.products.find((product) => product.sku === "MA-ALK");
  const box = (db: Awaited<ReturnType<typeof createSeedDatabase>>) =>
    db.products.find((product) => product.sku === "MP-KUL");
  assert.equal(dress(first)?.id, dress(second)?.id);
  assert.equal(box(first)?.id, box(second)?.id);
  assert.equal(first.organizations.find((item) => item.slug === "mercis-atelier")?.id, second.organizations.find((item) => item.slug === "mercis-atelier")?.id);
  const butik = first.organizations.find((item) => item.slug === "mercis-atelier");
  const vera = first.users.find((item) => item.email === "vera@mercisatelier.rs");
  const ana = first.users.find((item) => item.email === "ana@mesarapajic.rs");
  assert.equal(vera?.kind, "supplier");
  assert.notEqual(vera?.id, ana?.id);
  assert.equal(first.members.some((item) => item.userId === vera?.id && item.organizationId === butik?.id && item.role === "owner"), true);
  const mesara = first.organizations.find((item) => item.slug === "mesara-pajic");
  assert.equal(mesara?.name, "Mesara Pajić");
  assert.equal(mesara?.city, "Bački Petrovac");
  assert.equal(mesara?.brandColor, "#0c1f2e");
  assert.equal(mesara?.logoUrl, "/suppliers/mesara-pajic-logo.jpg");
  assert.equal(mesara?.coverUrl, "/products/mesara-pajic-cover.jpg");
  assert.equal(mesara?.audience, "oba");
  const physical = first.customers.filter((item) => item.organizationId === mesara?.id && item.party === "fizicka");
  assert.deepEqual(
    physical.map((item) => item.businessName).sort(),
    ["Milica Radić", "Nikola Jovanović"],
  );
  assert.equal(
    first.orders.some((order) => order.customerId === physical.find((item) => item.businessName === "Milica Radić")?.id),
    true,
  );
  assert.equal(
    first.orders.some((order) => order.customerId === physical.find((item) => item.businessName === "Nikola Jovanović")?.id),
    true,
  );
  assert.equal(mesara?.trackStock, false);
  assert.equal(butik?.trackStock, false);
  assert.equal(mesara?.slug, "mesara-pajic");
  assert.equal(mesara?.email, "porudzbine@mesarapajic.rs");
  assert.equal(mesara?.notificationEmail, "stephanbosch94@gmail.com");
  assert.equal(butik?.notificationEmail, "stephanbosch94@gmail.com");
  assert.equal(butik?.name, "Mercis Atelier");
  assert.equal(first.products.some((product) => product.sku === "BV-HALJ"), false);
  const meat = first.products.filter((product) => product.organizationId === mesara?.id && product.active);
  assert.equal(meat.length, 11);
  assert.equal(
    meat.every((product) => product.unit !== "kilogram" || product.minQuantity === 0.5),
    true,
  );
  assert.equal(meat.every((product) => product.stockQuantity > 0), true);
  assert.equal(meat.find((product) => product.sku === "MP-KUL")?.stockQuantity, 14);
  assert.equal(meat.find((product) => product.sku === "MP-SKOB")?.stockQuantity, 18);
  const cancelled = first.orders.find((order) => order.organizationId === mesara?.id && order.number.endsWith("-1008"));
  assert.equal(cancelled?.status, "otkazana");
  const dunav = first.orders.find((order) => order.organizationId === mesara?.id && order.number.endsWith("-1001"));
  assert.equal(
    first.orderItems.some((item) => item.orderId === dunav?.id && item.name === "Petrovački kulen"),
    true,
  );
  assert.equal(butik?.audience, "fizicka");

  const marko = first.users.find((item) => item.email === "marko@restorandunav.rs");
  const jovana = first.users.find((item) => item.email === "jovana@mercisatelier.rs");
  assert.equal(marko?.kind, "buyer");
  assert.equal(marko?.confirmationEmail, "stephanbosch94@gmail.com");
  assert.equal(jovana?.confirmationEmail, "stephanbosch94@gmail.com");
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

test("an existing Pult database picks up the meat shop without a new generation", async () => {
  const db = await createSeedDatabase();
  const org = db.organizations.find((item) => item.slug === "mesara-pajic");
  assert.ok(org);
  org.name = "Pult";
  org.slug = "gastro-supply";
  org.email = "porudzbine@gastrosupply.rs";
  org.notificationEmail = "porudzbine@gastrosupply.rs";
  org.city = "Novi Sad";
  org.address = "Bulevar oslobođenja 88";
  org.brandColor = "#14532d";
  const ana = db.users.find((item) => item.email === "ana@mesarapajic.rs");
  assert.ok(ana);
  ana.email = "ana@gastrosupply.rs";
  const jewel = db.organizations.find((item) => item.slug === "mercis-atelier");
  assert.ok(jewel);
  jewel.name = "Butik Vera";
  jewel.slug = "butik-vera";
  const ring = db.products.find((item) => item.sku === "MA-ALK")?.name;
  for (const item of db.orderItems.filter((entry) => entry.organizationId === org.id)) {
    item.sku = "PC-025";
    item.name = "Papirna čaša 2,5 dl";
    item.productId = "stara-casa";
  }
  db.products.push({
    id: "stara-casa",
    organizationId: org.id,
    categoryId: null,
    name: "Papirna čaša 2,5 dl",
    sku: "PC-025",
    description: "",
    unit: "komad",
    pricePara: 450,
    salePricePara: null,
    imageUrl: null,
    imageUrls: [],
    active: true,
    minQuantity: 100,
    stockQuantity: 0,
    createdAt: org.createdAt,
    updatedAt: org.createdAt,
  });
  const cancelled = db.orders.find((order) => order.organizationId === org.id && order.number.endsWith("-1008"));
  assert.equal(await ensureRetailDemo(db), true);
  assert.equal(org.name, "Mesara Pajić");
  assert.equal(org.city, "Bački Petrovac");
  assert.equal(org.address, "Jarmočna 20");
  assert.equal(org.brandColor, "#0c1f2e");
  assert.equal(org.logoUrl, "/suppliers/mesara-pajic-logo.jpg");
  assert.equal(org.coverUrl, "/products/mesara-pajic-cover.jpg");
  assert.equal(org.audience, "oba");
  assert.equal(org.slug, "mesara-pajic");
  assert.equal(org.email, "porudzbine@mesarapajic.rs");
  assert.equal(org.notificationEmail, "stephanbosch94@gmail.com");
  assert.equal(jewel.notificationEmail, "stephanbosch94@gmail.com");
  assert.equal(ana.email, "ana@mesarapajic.rs");
  assert.equal(jewel.name, "Mercis Atelier");
  assert.equal(jewel.slug, "mercis-atelier");
  assert.equal(db.products.some((item) => item.organizationId === org.id && item.sku === "PC-025"), false);
  assert.equal(db.products.filter((item) => item.organizationId === org.id && item.active).length, 11);
  assert.equal(db.orderItems.some((item) => item.organizationId === org.id && item.sku === "PC-025"), false);
  assert.equal(cancelled?.status, "otkazana");
  for (const order of db.orders.filter((item) => item.organizationId === org.id)) {
    const lines = db.orderItems.filter((item) => item.orderId === order.id);
    assert.equal(lines.reduce((sum, item) => sum + item.lineTotalPara, 0), order.totalPara);
    assert.equal(lines.every((item) => item.name !== "Papirna čaša 2,5 dl"), true);
  }
  assert.equal(db.products.find((item) => item.sku === "MA-ALK")?.name, ring);
  assert.equal(db.products.some((item) => item.sku === "BV-HALJ"), false);
  assert.equal(await ensureRetailDemo(db), false);
});

test("an existing Mala mesara Pajić name becomes Mesara Pajić without replacing a chosen name", async () => {
  const db = await createSeedDatabase();
  const org = db.organizations.find((item) => item.slug === "mesara-pajic");
  assert.ok(org);
  const productIds = db.products.filter((item) => item.organizationId === org.id).map((item) => item.id);
  org.name = "Mala mesara Pajić";
  assert.equal(await ensureRetailDemo(db), true);
  assert.equal(org.name, "Mesara Pajić");
  assert.equal(org.slug, "mesara-pajic");
  assert.deepEqual(
    db.products.filter((item) => item.organizationId === org.id).map((item) => item.id),
    productIds,
  );
  assert.equal(await ensureRetailDemo(db), false);

  org.name = "Porodična mesara";
  assert.equal(await ensureRetailDemo(db), false);
  assert.equal(org.name, "Porodična mesara");
});

test("an existing meat shop keeps physical customers and an order from each", async () => {
  const db = await createSeedDatabase();
  const org = db.organizations.find((item) => item.slug === "mesara-pajic");
  assert.ok(org);
  org.audience = "pravna";
  const physicalIds = new Set(
    db.customers.filter((item) => item.organizationId === org.id && item.party === "fizicka").map((item) => item.id),
  );
  const orderIds = new Set(db.orders.filter((item) => physicalIds.has(item.customerId)).map((item) => item.id));
  db.customers = db.customers.filter((item) => !physicalIds.has(item.id));
  db.orders = db.orders.filter((item) => !orderIds.has(item.id));
  db.orderItems = db.orderItems.filter((item) => !orderIds.has(item.orderId));
  db.statusHistory = db.statusHistory.filter((item) => !orderIds.has(item.orderId));
  const next = org.nextOrderNumber;
  assert.equal(await ensureRetailDemo(db), true);
  assert.equal(org.audience, "oba");
  const physical = db.customers.filter((item) => item.organizationId === org.id && item.party === "fizicka");
  assert.deepEqual(
    physical.map((item) => item.businessName).sort(),
    ["Milica Radić", "Nikola Jovanović"],
  );
  for (const customer of physical) {
    assert.equal(db.orders.some((order) => order.customerId === customer.id && order.status !== "otkazana"), true);
  }
  assert.ok(org.nextOrderNumber > next);
  assert.equal(await ensureRetailDemo(db), false);
  org.audience = "pravna";
  assert.equal(await ensureRetailDemo(db), false);
  assert.equal(org.audience, "pravna");
});

test("missing warehouse stock is filled without replacing the meat shop", async () => {
  const db = await createSeedDatabase();
  const org = db.organizations.find((item) => item.slug === "mesara-pajic");
  assert.ok(org);
  const cover = org.coverUrl;
  const logo = org.logoUrl;
  const description = org.description;
  const kulen = db.products.find((product) => product.sku === "MP-KUL");
  const but = db.products.find((product) => product.sku === "MP-BUT");
  assert.ok(kulen && but);
  kulen.stockQuantity = 0;
  delete (but as { stockQuantity?: number }).stockQuantity;
  assert.equal(await ensureRetailDemo(db), true);
  assert.equal(org.name, "Mesara Pajić");
  assert.equal(org.brandColor, "#0c1f2e");
  assert.equal(org.coverUrl, cover);
  assert.equal(org.logoUrl, logo);
  assert.equal(org.description, description);
  assert.equal(kulen.stockQuantity, 0);
  assert.equal(but.stockQuantity, 48);
  assert.equal(await ensureRetailDemo(db), false);
});
