import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { DemoStore } from "@/lib/data/demo-store";
import {
  DEMO_PASSWORD,
  PLATFORM_ADMIN_EMAIL,
  SEED_GENERATION,
  createSeedDatabase,
  ensurePlatformAdmin,
} from "@/lib/data/seed";

test("seed and ensure create the platform admin, plans, subscriptions, and scoped invoices", async () => {
  assert.equal(SEED_GENERATION, 2);
  const db = await createSeedDatabase();
  const admin = db.users.find((user) => user.email === PLATFORM_ADMIN_EMAIL);
  const pult = db.organizations.find((item) => item.slug === "gastro-supply");
  const vera = db.organizations.find((item) => item.slug === "butik-vera");
  const dressId = db.products.find((product) => product.sku === "BV-HALJ")?.id;
  assert.equal(admin?.kind, "platform");
  assert.equal(db.members.some((member) => member.userId === admin?.id), false);
  assert.ok(db.plans.length >= 2);
  assert.ok(pult?.active);
  assert.ok(vera?.active);
  assert.equal(db.subscriptions.some((item) => item.organizationId === pult?.id && item.status === "aktivna"), true);
  assert.equal(db.subscriptions.some((item) => item.organizationId === vera?.id && item.status === "aktivna"), true);

  const pultInvoices = db.invoices.filter((item) => item.organizationId === pult?.id);
  const veraInvoices = db.invoices.filter((item) => item.organizationId === vera?.id);
  assert.ok(pultInvoices.length >= 2);
  assert.ok(veraInvoices.length >= 1);
  assert.equal(pultInvoices.some((item) => item.organizationId === vera?.id), false);
  const poslovni = db.plans.find((plan) => plan.name === "Poslovni");
  const osnovni = db.plans.find((plan) => plan.name === "Osnovni");
  assert.equal(pultInvoices.every((item) => item.amountPara === poslovni?.monthlyPricePara), true);
  assert.equal(veraInvoices.every((item) => item.amountPara === osnovni?.monthlyPricePara), true);

  db.users = db.users.filter((user) => user.email !== PLATFORM_ADMIN_EMAIL);
  db.plans = [];
  db.subscriptions = [];
  db.invoices = [];
  db.supplierNotes = [];
  assert.equal(await ensurePlatformAdmin(db), true);
  assert.equal(await ensurePlatformAdmin(db), false);
  assert.equal(db.users.find((user) => user.email === PLATFORM_ADMIN_EMAIL)?.kind, "platform");
  assert.equal(db.members.some((member) => member.userId === admin?.id), false);
  assert.equal(db.products.find((product) => product.sku === "BV-HALJ")?.id, dressId);

  const dir = await mkdtemp(path.join(tmpdir(), "poruci-platform-"));
  try {
    const store = new DemoStore(path.join(dir, "db.json"), { seed: true });
    const user = await store.verifyCredentials(PLATFORM_ADMIN_EMAIL, DEMO_PASSWORD);
    assert.ok(user);
    const account = await store.resolveAccount(user.id);
    assert.equal(account?.kind, "platform");
    assert.ok(pult);
    const invoices = await store.listInvoices(pult.id);
    assert.ok(invoices.length >= 2);
    assert.equal(invoices.every((item) => item.organizationId === pult.id), true);
    const suppliers = await store.listPlatformSuppliers();
    assert.equal(suppliers.some((item) => item.organization.name === "Pult"), true);
    assert.equal(suppliers.some((item) => item.organization.name === "Butik Vera"), true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
