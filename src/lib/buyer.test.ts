import assert from "node:assert/strict";
import test from "node:test";

import { isCompanyBuyer } from "@/lib/buyer";

test("a buyer with a PIB is a company", () => {
  assert.equal(isCompanyBuyer({ name: "Ana Petrović", businessName: "Ana Petrović", pib: "123456789" }), true);
});

test("a buyer whose firm name differs from their own name is a company", () => {
  assert.equal(isCompanyBuyer({ name: "Ana Petrović", businessName: "Restoran Dunav", pib: "" }), true);
});

test("a personal account is not a company", () => {
  assert.equal(isCompanyBuyer({ name: "Ana Petrović", businessName: "Ana Petrović", pib: "" }), false);
});
