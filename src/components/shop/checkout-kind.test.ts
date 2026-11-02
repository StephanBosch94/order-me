import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BuyerKindChoice, checkoutParty, showsGuestPartySwitch } from "@/components/shop/checkout-kind";
import { retailOrderSchema } from "@/lib/validators";

const buyer = { userId: "buyer" };

test("the party switch is only for a guest on a store that sells to both", () => {
  assert.equal(showsGuestPartySwitch("oba", null), true);
  assert.equal(showsGuestPartySwitch("oba", undefined), true);
  assert.equal(showsGuestPartySwitch("oba", buyer), false);
  assert.equal(showsGuestPartySwitch("pravna", null), false);
  assert.equal(showsGuestPartySwitch("fizicka", null), false);
  assert.equal(showsGuestPartySwitch("pravna", buyer), false);
  assert.equal(showsGuestPartySwitch("fizicka", buyer), false);
});

test("checkout uses the account party, and a guest on a mixed store defaults to fizičko lice", () => {
  assert.equal(checkoutParty("oba", null, "fizicka"), "fizicka");
  assert.equal(checkoutParty("oba", null, "pravna"), "pravna");
  assert.equal(checkoutParty("oba", "pravna", "fizicka"), "pravna");
  assert.equal(checkoutParty("oba", "fizicka", "pravna"), "fizicka");
  assert.equal(checkoutParty("pravna", null, "fizicka"), "pravna");
  assert.equal(checkoutParty("pravna", "fizicka", "fizicka"), "pravna");
  assert.equal(checkoutParty("fizicka", "pravna", "pravna"), "fizicka");
});

test("the guest switch offers Fizičko lice and Pravno lice, with fizičko selected by default", () => {
  const html = renderToStaticMarkup(createElement(BuyerKindChoice, { value: "fizicka", onChange: () => {} }));
  assert.match(html, /Fizičko lice/);
  assert.match(html, /Pravno lice/);
  assert.equal(html.includes("B2B"), false);
  assert.equal(html.includes("B2C"), false);
  assert.match(html, /<input[^>]*value="fizicka"[^>]*checked=""|<input[^>]*checked=""[^>]*value="fizicka"/);
  assert.equal(/<input[^>]*value="pravna"[^>]*checked=/.test(html), false);
});

const order = {
  slug: "demo",
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  customerName: "Jovana Ivić",
  email: "jovana@example.com",
  phone: "061123456",
  address: "Ulica 1",
  postalCode: "11000",
  city: "Beograd",
  notes: "",
  items: [{ productId: "p1", quantity: 1 }],
};

test("fizičko lice pays with the retail methods, and pravno lice pays on račun", () => {
  assert.equal(retailOrderSchema.safeParse({ ...order, paymentMethod: "pouzecem" }).success, true);
  assert.equal(retailOrderSchema.safeParse({ ...order, paymentMethod: "racun" }).success, false);
  const company = retailOrderSchema.safeParse({
    ...order,
    paymentMethod: "racun",
    company: true,
    businessName: "Restoran Dunav",
    pib: "123456789",
    mb: "12345678",
  });
  assert.equal(company.success, true);
  if (company.success) assert.equal(company.data.paymentMethod, "racun");
  assert.equal(
    retailOrderSchema.safeParse({
      ...order,
      paymentMethod: "pouzecem",
      company: true,
      businessName: "Restoran Dunav",
      pib: "123456789",
      mb: "12345678",
    }).success,
    false,
  );
  const missingPib = retailOrderSchema.safeParse({
    ...order,
    paymentMethod: "racun",
    company: true,
    businessName: "Restoran Dunav",
    pib: "",
    mb: "12345678",
  });
  assert.equal(missingPib.success, false);
});
