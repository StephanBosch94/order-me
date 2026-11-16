import assert from "node:assert/strict";
import test from "node:test";

import { parentAuthClearHeaders, supabaseAuthCookieName, vendroHost } from "@/lib/auth-cookie";

test("vendro hosts share one parent domain", () => {
  assert.equal(vendroHost("vendro.rs"), true);
  assert.equal(vendroHost("savatrade.vendro.rs"), true);
  assert.equal(vendroHost("www.vendro.rs:443"), true);
  assert.equal(vendroHost("localhost"), false);
  assert.equal(vendroHost("vendro-app.netlify.app"), false);
});

test("only supabase auth cookies are cleared", () => {
  assert.equal(supabaseAuthCookieName("sb-abcdefghijklmnop-auth-token"), true);
  assert.equal(supabaseAuthCookieName("sb-abcdefghijklmnop-auth-token.0"), true);
  assert.equal(supabaseAuthCookieName("poruci_session"), false);
  const header = "sb-abcdefghijklmnop-auth-token=secret-value; theme=dark";
  const clears = parentAuthClearHeaders(header);
  assert.equal(clears.length, 1);
  assert.match(clears[0] ?? "", /Max-Age=0/);
  assert.match(clears[0] ?? "", /Domain=\.vendro\.rs/);
  assert.equal((clears[0] ?? "").includes("secret-value"), false);
});
