import assert from "node:assert/strict";
import test from "node:test";

import { buyerOrderDestination } from "@/lib/order-link";

const orders = [
  {
    id: "order-1",
    supplierSlug: "mesara-pajic",
    confirmationToken: "token-1",
  },
];

test("a buyer order link opens that order confirmation", () => {
  assert.equal(
    buyerOrderDestination("/orders/order-1", orders),
    "/s/mesara-pajic/potvrda/token-1",
  );
});

test("a buyer order link keeps the order when the address has a query", () => {
  assert.equal(
    buyerOrderDestination("/orders/order-1?next=1", orders),
    "/s/mesara-pajic/potvrda/token-1",
  );
});

test("another buyer's order link does not open a shop", () => {
  assert.equal(buyerOrderDestination("/orders/other", orders), null);
});

test("the order list is not treated as one order", () => {
  assert.equal(buyerOrderDestination("/orders", orders), null);
});
