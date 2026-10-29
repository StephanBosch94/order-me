import assert from "node:assert/strict";
import test from "node:test";

import { setupReady, storeSetup } from "@/lib/setup";
import type { Organization } from "@/lib/data/types";

function organization(overrides: Partial<Organization> = {}): Organization {
  return {
    id: "org",
    name: "Nova radnja",
    slug: "nova-radnja",
    email: "vlasnik@example.com",
    notificationEmail: "vlasnik@example.com",
    phone: "",
    address: "",
    city: "",
    pib: "",
    mb: "",
    logoUrl: null,
    brandColor: null,
    channel: "b2c",
    audience: "oba",
    orderPrefix: "NR",
    nextOrderNumber: 1001,
    active: true,
    createdAt: "2026-10-29T00:00:00.000Z",
    updatedAt: "2026-10-29T00:00:00.000Z",
    ...overrides,
  };
}

test("a new shop keeps the unfinished steps open and shows saved values", () => {
  const steps = storeSetup(organization({ phone: "123" }), 0);
  const byId = Object.fromEntries(steps.map((step) => [step.id, step]));

  assert.equal(byId.name?.done, true);
  assert.equal(byId.name?.detail, "Nova radnja");
  assert.equal(byId.audience?.done, true);
  assert.equal(byId.audience?.detail, "I jednim i drugima");
  assert.equal(byId.phone?.done, false);
  assert.equal(byId.phone?.detail, "123");
  assert.equal(byId.address?.done, false);
  assert.equal(byId.pib?.done, false);
  assert.equal(byId.product?.done, false);
  assert.equal(setupReady(steps), false);
});

test("a shop for people does not ask for PIB", () => {
  const steps = storeSetup(organization({ audience: "fizicka", channel: "b2c" }), 0);
  assert.equal(steps.some((step) => step.id === "pib"), false);
});

test("the guide is finished when the store can take orders", () => {
  const steps = storeSetup(
    organization({
      phone: "+381 11 555 0188",
      address: "Gospodar Jevremova 28",
      city: "Beograd",
      pib: "123456789",
    }),
    2,
  );
  assert.equal(setupReady(steps), true);
  assert.equal(steps.find((step) => step.id === "address")?.detail, "Gospodar Jevremova 28, Beograd");
  assert.equal(steps.find((step) => step.id === "product")?.detail, "2 aktivna proizvoda");
});
