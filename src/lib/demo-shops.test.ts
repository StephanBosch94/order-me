import assert from "node:assert/strict";
import test from "node:test";

import { sendsOrderMail } from "@/lib/demo-shops";

test("demo shops do not send order mail", () => {
  assert.equal(sendsOrderMail("mesara-pajic"), false);
  assert.equal(sendsOrderMail("mercis-atelier"), false);
  assert.equal(sendsOrderMail("nova-radnja"), true);
});
