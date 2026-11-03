import assert from "node:assert/strict";
import test from "node:test";

import { followUpReason, salesFollowUps, type FollowUpCustomer, type FollowUpOrder } from "@/lib/follow-ups";

const now = new Date("2026-11-02T12:00:00.000Z");

function customer(id: string, createdAt: string): FollowUpCustomer {
  return {
    id,
    code: id.toUpperCase(),
    businessName: id,
    email: `${id}@example.com`,
    phone: "060000000",
    createdAt,
  };
}

function order(customerId: string, createdAt: string, status = "isporucena"): FollowUpOrder {
  return { customerId, status, totalPara: 10000, createdAt };
}

test("a customer appears once their usual gap has passed", () => {
  const items = salesFollowUps(
    [customer("market", "2026-09-01T10:00:00.000Z")],
    [order("market", "2026-10-27T15:00:00.000Z"), order("market", "2026-10-30T15:00:00.000Z")],
    now,
  );
  assert.equal(items.length, 1);
  assert.equal(items[0]?.kind, "kasni");
  assert.equal(items[0]?.intervalDays, 3);
  assert.equal(items[0]?.daysSince, 3);
  assert.match(followUpReason(items[0]!), /Frekvencija naručivanja je na oko 3 dana/);
});

test("a customer still inside the usual gap stays off the list", () => {
  const items = salesFollowUps(
    [customer("dunav", "2026-09-01T10:00:00.000Z"), customer("market", "2026-09-01T10:00:00.000Z")],
    [
      order("dunav", "2026-10-22T15:00:00.000Z"),
      order("dunav", "2026-11-01T15:00:00.000Z"),
      order("market", "2026-10-27T15:00:00.000Z"),
      order("market", "2026-10-30T15:00:00.000Z"),
    ],
    now,
  );
  assert.deepEqual(
    items.map((item) => item.businessName),
    ["market"],
  );
});

test("a customer with no orders and a single old order are both tasks", () => {
  const items = salesFollowUps(
    [customer("nov", "2026-10-01T10:00:00.000Z"), customer("jednom", "2026-09-01T10:00:00.000Z")],
    [order("jednom", "2026-10-01T10:00:00.000Z"), order("nov", "2026-10-20T10:00:00.000Z", "otkazana")],
    now,
  );
  assert.deepEqual(
    items.map((item) => item.kind),
    ["jedna", "nije_narucio"],
  );
  assert.equal(items[1]?.lastOrderAt, null);
});
