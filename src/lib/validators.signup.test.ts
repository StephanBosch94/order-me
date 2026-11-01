import assert from "node:assert/strict";
import test from "node:test";

import { signupSchema } from "@/lib/validators";

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

test("supplier signup rejects a missing audience", () => {
  const parsed = signupSchema.safeParse(supplier);
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.equal(parsed.error.issues.some((issue) => issue.path[0] === "audience"), true);
  }
});
