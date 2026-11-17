import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { readSupportGrant, signSupportGrant } from "@/lib/support-access";

process.env.SESSION_SECRET = "test-session-secret-at-least-32b!!";

test("a support grant names the admin and the shop, and rejects a changed shop", () => {
  const now = Date.now();
  const token = signSupportGrant("admin-1", "org-1", now);
  assert.deepEqual(readSupportGrant(token, now), {
    adminId: "admin-1",
    organizationId: "org-1",
    exp: now + 2 * 60 * 60 * 1000,
  });
  assert.equal(readSupportGrant(token, now + 2 * 60 * 60 * 1000), null);

  const [version, payload, signature] = token.split(".");
  const swapped = Buffer.from(JSON.stringify({ adminId: "admin-1", organizationId: "org-2", exp: now + 1000 })).toString(
    "base64url",
  );
  assert.equal(readSupportGrant(`${version}.${swapped}.${signature}`, now), null);
  assert.equal(readSupportGrant(`${token}x`, now), null);

  const previous = process.env.SESSION_SECRET;
  try {
    process.env.SESSION_SECRET = "other-secret-that-is-at-least-32bx";
    const signed = signSupportGrant("admin-1", "org-1", now);
    process.env.SESSION_SECRET = "third-secret-that-is-at-least-32b!";
    assert.equal(readSupportGrant(signed, now), null);
  } finally {
    process.env.SESSION_SECRET = previous;
  }

  const forgedPayload = Buffer.from(JSON.stringify({ adminId: "admin-1", organizationId: "org-1", exp: now + 1000 })).toString(
    "base64url",
  );
  const forgedSignature = createHmac("sha256", "not-the-session-secret-32bytes!!").update(forgedPayload).digest("base64url");
  assert.equal(readSupportGrant(`v1.${forgedPayload}.${forgedSignature}`, now), null);
});
