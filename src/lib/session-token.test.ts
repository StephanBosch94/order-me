import assert from "node:assert/strict";
import test from "node:test";

import { readDemoSession, readDemoSessionCarry, signDemoSession, type SessionCarry } from "@/lib/session-token";

const DAY = 24 * 60 * 60 * 1000;

test("a signed demo session carries the user id without the sessions table", () => {
  const token = signDemoSession("user-ana");
  assert.equal(readDemoSession(token), "user-ana");
  assert.equal(readDemoSession("a".repeat(64)), null);
  assert.equal(readDemoSession(`${token}x`), null);
  assert.equal(readDemoSession(signDemoSession("user-ana", Date.now() - 15 * DAY)), null);

  const previous = process.env.SESSION_SECRET;
  try {
    process.env.SESSION_SECRET = "domain-secret";
    const signed = signDemoSession("user-ana");
    assert.equal(readDemoSession(signed), "user-ana");
    process.env.SESSION_SECRET = "other-secret";
    assert.equal(readDemoSession(signed), null);
  } finally {
    if (previous === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previous;
  }
});

test("a signed session can carry a new account for another server", () => {
  const carry: SessionCarry = {
    user: {
      id: "user-nova",
      email: "nova@example.com",
      name: "Nova Proba",
      passwordHash: "salt:hash",
      kind: "supplier",
      businessName: "",
      phone: "",
      address: "",
      city: "",
      pib: "",
      bankAccount: "",
      createdAt: "2026-11-03T00:00:00.000Z",
    },
    organization: {
      id: "org-nova",
      name: "Proba",
      slug: "proba",
      email: "nova@example.com",
      notificationEmail: "nova@example.com",
      phone: "",
      address: "",
      city: "",
      pib: "",
      mb: "",
      logoUrl: null,
      brandColor: null,
      coverUrl: null,
      description: "",
      trade: "",
      channel: "b2b",
      audience: "pravna",
      orderPrefix: "PR",
      nextOrderNumber: 1001,
      active: true,
      trackStock: false,
      publicStore: true,
      efakturaApiKey: "tajna",
      efakturaEnabled: false,
      efakturaEnvironment: "demo",
      ipsAccount: "",
      createdAt: "2026-11-03T00:00:00.000Z",
      updatedAt: "2026-11-03T00:00:00.000Z",
    },
    member: {
      id: "member-nova",
      organizationId: "org-nova",
      userId: "user-nova",
      role: "owner",
      createdAt: "2026-11-03T00:00:00.000Z",
    },
  };
  const token = signDemoSession("user-nova", Date.now(), carry);
  assert.equal(readDemoSession(token), "user-nova");
  assert.equal(token.length < 3800, true);
  const restored = readDemoSessionCarry(token);
  assert.equal(restored?.user.email, "nova@example.com");
  assert.equal(restored?.organization?.slug, "proba");
  assert.equal(restored?.organization?.efakturaApiKey, "");
  assert.equal(restored?.member?.role, "owner");
  assert.equal(readDemoSessionCarry(signDemoSession("user-ana")), null);
});
