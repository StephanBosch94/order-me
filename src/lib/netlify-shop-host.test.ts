import assert from "node:assert/strict";
import test from "node:test";

import { ensureShopDomainAlias, shopPublicHostname } from "@/lib/netlify-shop-host";

test("shop public hostnames follow the store domain", () => {
  assert.equal(shopPublicHostname("bosch-veleprodaja", "vendro.rs"), "bosch-veleprodaja.vendro.rs");
  assert.equal(shopPublicHostname("sava-trade", "vendro.rs"), "savatrade.vendro.rs");
  assert.equal(shopPublicHostname("bosch-veleprodaja", "localhost"), null);
  assert.equal(shopPublicHostname("", "vendro.rs"), null);
});

test("ensureShopDomainAlias skips when credentials are missing", async () => {
  const previous = {
    token: process.env.NETLIFY_AUTH_TOKEN,
    site: process.env.NETLIFY_SITE_ID,
    siteFallback: process.env.SITE_ID,
    domain: process.env.NEXT_PUBLIC_STORE_DOMAIN,
  };
  process.env.NEXT_PUBLIC_STORE_DOMAIN = "vendro.rs";
  delete process.env.NETLIFY_AUTH_TOKEN;
  delete process.env.NETLIFY_SITE_ID;
  delete process.env.SITE_ID;

  const result = await ensureShopDomainAlias("nova-radnja", async () => {
    throw new Error("fetch should not run");
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "missing-netlify-credentials");

  restore(previous);
});

test("ensureShopDomainAlias adds a missing alias once", async () => {
  const previous = {
    token: process.env.NETLIFY_AUTH_TOKEN,
    site: process.env.NETLIFY_SITE_ID,
    siteFallback: process.env.SITE_ID,
    domain: process.env.NEXT_PUBLIC_STORE_DOMAIN,
  };
  process.env.NEXT_PUBLIC_STORE_DOMAIN = "vendro.rs";
  process.env.NETLIFY_AUTH_TOKEN = "test-token";
  process.env.NETLIFY_SITE_ID = "site-1";

  const calls: { url: string; method: string; body?: string }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? init.body : undefined;
    calls.push({ url, method, body });
    if (method === "GET") {
      return new Response(JSON.stringify({ domain_aliases: ["www.vendro.rs"] }), { status: 200 });
    }
    return new Response(JSON.stringify({ domain_aliases: ["www.vendro.rs", "nova-radnja.vendro.rs"] }), {
      status: 200,
    });
  };

  const result = await ensureShopDomainAlias("nova-radnja", fetchImpl);
  assert.deepEqual(result, {
    ok: true,
    hostname: "nova-radnja.vendro.rs",
    skipped: false,
    created: true,
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[1]?.method, "PUT");
  assert.match(calls[1]?.body ?? "", /nova-radnja\.vendro\.rs/);

  restore(previous);
});

test("ensureShopDomainAlias is a no-op when the alias already exists", async () => {
  const previous = {
    token: process.env.NETLIFY_AUTH_TOKEN,
    site: process.env.NETLIFY_SITE_ID,
    siteFallback: process.env.SITE_ID,
    domain: process.env.NEXT_PUBLIC_STORE_DOMAIN,
  };
  process.env.NEXT_PUBLIC_STORE_DOMAIN = "vendro.rs";
  process.env.NETLIFY_AUTH_TOKEN = "test-token";
  process.env.NETLIFY_SITE_ID = "site-1";

  let puts = 0;
  const fetchImpl: typeof fetch = async (_input, init) => {
    if ((init?.method ?? "GET") === "PUT") {
      puts += 1;
      return new Response("{}", { status: 200 });
    }
    return new Response(JSON.stringify({ domain_aliases: ["bosch-veleprodaja.vendro.rs"] }), { status: 200 });
  };

  const result = await ensureShopDomainAlias("bosch-veleprodaja", fetchImpl);
  assert.deepEqual(result, {
    ok: true,
    hostname: "bosch-veleprodaja.vendro.rs",
    skipped: false,
    created: false,
  });
  assert.equal(puts, 0);

  restore(previous);
});

function restore(previous: {
  token: string | undefined;
  site: string | undefined;
  siteFallback: string | undefined;
  domain: string | undefined;
}) {
  setEnv("NETLIFY_AUTH_TOKEN", previous.token);
  setEnv("NETLIFY_SITE_ID", previous.site);
  setEnv("SITE_ID", previous.siteFallback);
  setEnv("NEXT_PUBLIC_STORE_DOMAIN", previous.domain);
}

function setEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
