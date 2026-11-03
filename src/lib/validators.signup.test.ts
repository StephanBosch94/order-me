import assert from "node:assert/strict";
import test from "node:test";

import { companyBuyerProfileSchema, signupSchema } from "@/lib/validators";

const supplier = {
  kind: "supplier" as const,
  name: "Ana Anić",
  email: "ana@example.com",
  password: "poruci-demo",
  organizationName: "Nova prodavnica",
  phone: "",
};

test("supplier signup accepts pravna, fizicka, and oba", () => {
  for (const audience of ["pravna", "fizicka", "oba"] as const) {
    const parsed = signupSchema.safeParse({ ...supplier, audience });
    assert.equal(parsed.success, true);
    if (parsed.success && parsed.data.kind === "supplier") {
      assert.equal(parsed.data.audience, audience);
    }
  }
});

const buyer = {
  kind: "buyer" as const,
  name: "Marko Jović",
  email: "marko@restorandunav.rs",
  password: "poruci-demo",
  businessName: "Restoran Dunav",
  phone: "0631112200",
  address: "Bulevar kralja Aleksandra 142",
  city: "Beograd",
  pib: "108765432",
  mb: "20123456",
  postalCode: "11000",
  confirmationEmail: "",
};

test("a person can open an account without a company", () => {
  const parsed = signupSchema.safeParse({
    kind: "buyer",
    profile: "osoba",
    name: "Jovana Ilić",
    email: "jovana@example.com",
    password: "poruci-demo",
    businessName: "Jovana Ilić",
    phone: "0645550199",
    address: "Knez Mihailova 18",
    city: "Beograd",
    pib: "",
    mb: "",
    postalCode: "11000",
    confirmationEmail: "",
  });
  assert.equal(parsed.success, true);
});

test("buyer signup does not require a bank account", () => {
  const parsed = signupSchema.safeParse(buyer);
  assert.equal(parsed.success, true);
});

test("company account form does not require a bank account", () => {
  const parsed = companyBuyerProfileSchema.safeParse({
    name: buyer.name,
    businessName: buyer.businessName,
    phone: buyer.phone,
    address: buyer.address,
    city: buyer.city,
    pib: buyer.pib,
    mb: buyer.mb,
    postalCode: buyer.postalCode,
    confirmationEmail: buyer.confirmationEmail,
  });
  assert.equal(parsed.success, true);
});

test("supplier signup rejects a missing audience", () => {
  const parsed = signupSchema.safeParse(supplier);
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.equal(parsed.error.issues.some((issue) => issue.path[0] === "audience"), true);
  }
});
