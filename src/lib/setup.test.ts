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
    coverUrl: null,
    description: "",
    channel: "b2c",
    audience: "oba",
    orderPrefix: "NR",
    nextOrderNumber: 1001,
    active: true,
    trackStock: false,
    efakturaApiKey: "",
    efakturaEnabled: false,
    efakturaEnvironment: "demo",
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
  assert.equal(byId.phone?.done, false);
  assert.equal(byId.phone?.detail, "123");
  assert.equal(byId.address?.done, false);
  assert.equal(byId.appearance?.done, false);
  assert.equal(byId.appearance?.title, "Izgled");
  assert.equal(byId.appearance?.detail, "Dodajte logo, naslovnu sliku i boju.");
  assert.equal(byId.appearance?.href, "/settings?tab=izgled");
  assert.equal(byId.product?.done, false);
  assert.equal(setupReady(steps), false);
});

test("the guide is finished when the store can take orders", () => {
  const steps = storeSetup(
    organization({
      phone: "+381 11 555 0188",
      address: "Gospodar Jevremova 28",
      city: "Beograd",
      pib: "123456789",
      mb: "21456789",
      logoUrl: "/suppliers/logo.jpg",
      coverUrl: "/products/cover.jpg",
      brandColor: "#0c1f2e",
    }),
    2,
  );
  assert.equal(setupReady(steps), true);
  assert.equal(steps.find((step) => step.id === "address")?.detail, "Gospodar Jevremova 28, Beograd · PIB 123456789 · MB 21456789");
  assert.equal(
    storeSetup(
      organization({
        phone: "+381 11 555 0188",
        address: "Gospodar Jevremova 28",
        city: "Beograd",
        pib: "123456789",
      }),
      2,
    ).find((step) => step.id === "address")?.done,
    false,
  );
  assert.equal(steps.find((step) => step.id === "product")?.detail, "2 aktivna proizvoda");
  assert.equal(steps.find((step) => step.id === "appearance")?.detail, "Logo, naslovna slika i boja su sačuvani.");
  assert.equal(
    storeSetup(
      organization({
        phone: "+381 11 555 0188",
        address: "Gospodar Jevremova 28",
        city: "Beograd",
        pib: "123456789",
        mb: "21456789",
        logoUrl: "/suppliers/logo.jpg",
        coverUrl: "/products/cover.jpg",
      }),
      2,
    ).find((step) => step.id === "appearance")?.detail,
    "Još treba boja.",
  );
});
