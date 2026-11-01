import assert from "node:assert/strict";
import test from "node:test";

import { isCompanyBuyer, normalizeBankAccount, normalizeMb, normalizePostalCode, orderConfirmationEmail } from "@/lib/buyer";

test("a buyer with a PIB is a company", () => {
  assert.equal(isCompanyBuyer({ name: "Ana Petrović", businessName: "Ana Petrović", pib: "123456789" }), true);
});

test("a buyer whose firm name differs from their own name is a company", () => {
  assert.equal(isCompanyBuyer({ name: "Ana Petrović", businessName: "Restoran Dunav", pib: "" }), true);
});

test("a personal account is not a company", () => {
  assert.equal(isCompanyBuyer({ name: "Ana Petrović", businessName: "Ana Petrović", pib: "" }), false);
});

test("a company registration number is 8 digits and a postal code is 5", () => {
  assert.equal(normalizeMb("2012 3456"), "20123456");
  assert.equal(normalizeMb("123"), null);
  assert.equal(normalizePostalCode("11 000"), "11000");
  assert.equal(normalizePostalCode("1100"), null);
});

test("a potvrda goes to the confirmation email, or the login email when that field is empty", () => {
  assert.equal(
    orderConfirmationEmail({ email: "marko@restorandunav.rs", confirmationEmail: "" }),
    "marko@restorandunav.rs",
  );
  assert.equal(
    orderConfirmationEmail({ email: "marko@restorandunav.rs", confirmationEmail: "  racuni@restorandunav.rs  " }),
    "racuni@restorandunav.rs",
  );
  assert.equal(orderConfirmationEmail({ email: "gost@firma.rs" }), "gost@firma.rs");
});

test("a bank account is 18 digits, kept with dashes", () => {
  assert.equal(normalizeBankAccount("160-0000000000123-45"), "160-0000000000123-45");
  assert.equal(normalizeBankAccount("160000000000012345"), "160-0000000000123-45");
  assert.equal(normalizeBankAccount("123"), null);
});
