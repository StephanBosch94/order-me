import assert from "node:assert/strict";
import test from "node:test";

import { readDemoSession, signDemoSession } from "@/lib/session-token";

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
