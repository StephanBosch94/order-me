import assert from "node:assert/strict";
import test from "node:test";

import { publicConfirmationUrl, publicStoreUrl, shopSlugFromHostname, storeHostAction } from "./store-host";

const domain = "vendro.app";

test("a shop host is the company slug", () => {
  assert.equal(shopSlugFromHostname("mesara-pajic.vendro.app", domain), "mesara-pajic");
  assert.equal(shopSlugFromHostname("Mesara-Pajic.vendro.app:443", domain), "mesara-pajic");
  assert.equal(shopSlugFromHostname("vendro.app", domain), null);
  assert.equal(shopSlugFromHostname("www.vendro.app", domain), null);
  assert.equal(shopSlugFromHostname("app.vendro.app", domain), null);
  assert.equal(shopSlugFromHostname("mesara-pajic.localhost", domain), null);
});

test("the shop root rewrites to the catalog and the old path redirects back", () => {
  assert.deepEqual(storeHostAction("mesara-pajic.vendro.app", "/", domain), {
    type: "rewrite",
    pathname: "/shop/mesara-pajic",
  });
  assert.deepEqual(storeHostAction("mesara-pajic.vendro.app", "/proizvod/abc", domain), {
    type: "rewrite",
    pathname: "/shop/mesara-pajic/proizvod/abc",
  });
  assert.deepEqual(storeHostAction("mesara-pajic.vendro.app", "/potvrda/token", domain), {
    type: "rewrite",
    pathname: "/s/mesara-pajic/potvrda/token",
  });
  assert.deepEqual(storeHostAction("mesara-pajic.vendro.app", "/shop/mesara-pajic/proizvod/abc", domain), {
    type: "redirect",
    hostname: "mesara-pajic.vendro.app",
    pathname: "/proizvod/abc",
  });
  assert.equal(storeHostAction("mesara-pajic.vendro.app", "/dashboard", domain), null);
});

test("the apex shop path redirects to the company host", () => {
  assert.deepEqual(storeHostAction("vendro.app", "/shop/sava-trade", domain), {
    type: "redirect",
    hostname: "sava-trade.vendro.app",
    pathname: "/",
  });
  assert.deepEqual(storeHostAction("www.vendro.app", "/shop/sava-trade/porudzbine", domain), {
    type: "redirect",
    hostname: "sava-trade.vendro.app",
    pathname: "/porudzbine",
  });
  assert.deepEqual(storeHostAction("vendro.app", "/s/sava-trade/potvrda/token", domain), {
    type: "redirect",
    hostname: "sava-trade.vendro.app",
    pathname: "/potvrda/token",
  });
  assert.equal(storeHostAction("vendro.app", "/login", domain), null);
  assert.equal(storeHostAction("vendro.app", "/shop/www", domain), null);
});

test("public addresses use the shop host", () => {
  assert.equal(publicStoreUrl("mesara-pajic", domain), "https://mesara-pajic.vendro.app");
  assert.equal(publicStoreUrl("mesara-pajic", "localhost"), "http://mesara-pajic.localhost:3000");
  assert.equal(
    publicConfirmationUrl("mesara-pajic", "token", domain),
    "https://mesara-pajic.vendro.app/potvrda/token",
  );
});
