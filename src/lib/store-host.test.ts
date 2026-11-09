import assert from "node:assert/strict";
import test from "node:test";

import { publicConfirmationUrl, publicStoreUrl, shopSlugFromHostname, storeHostAction } from "./store-host";

const domain = "prodora.app";

test("a shop host is the company slug", () => {
  assert.equal(shopSlugFromHostname("mesara-pajic.prodora.app", domain), "mesara-pajic");
  assert.equal(shopSlugFromHostname("Mesara-Pajic.prodora.app:443", domain), "mesara-pajic");
  assert.equal(shopSlugFromHostname("prodora.app", domain), null);
  assert.equal(shopSlugFromHostname("www.prodora.app", domain), null);
  assert.equal(shopSlugFromHostname("app.prodora.app", domain), null);
  assert.equal(shopSlugFromHostname("mesara-pajic.localhost", domain), null);
});

test("the shop root rewrites to the catalog and the old path redirects back", () => {
  assert.deepEqual(storeHostAction("mesara-pajic.prodora.app", "/", domain), {
    type: "rewrite",
    pathname: "/shop/mesara-pajic",
  });
  assert.deepEqual(storeHostAction("mesara-pajic.prodora.app", "/proizvod/abc", domain), {
    type: "rewrite",
    pathname: "/shop/mesara-pajic/proizvod/abc",
  });
  assert.deepEqual(storeHostAction("mesara-pajic.prodora.app", "/potvrda/token", domain), {
    type: "rewrite",
    pathname: "/s/mesara-pajic/potvrda/token",
  });
  assert.deepEqual(storeHostAction("mesara-pajic.prodora.app", "/shop/mesara-pajic/proizvod/abc", domain), {
    type: "redirect",
    hostname: "mesara-pajic.prodora.app",
    pathname: "/proizvod/abc",
  });
  assert.equal(storeHostAction("mesara-pajic.prodora.app", "/dashboard", domain), null);
});

test("the apex shop path redirects to the company host", () => {
  assert.deepEqual(storeHostAction("prodora.app", "/shop/sava-trade", domain), {
    type: "redirect",
    hostname: "sava-trade.prodora.app",
    pathname: "/",
  });
  assert.deepEqual(storeHostAction("www.prodora.app", "/shop/sava-trade/porudzbine", domain), {
    type: "redirect",
    hostname: "sava-trade.prodora.app",
    pathname: "/porudzbine",
  });
  assert.deepEqual(storeHostAction("prodora.app", "/s/sava-trade/potvrda/token", domain), {
    type: "redirect",
    hostname: "sava-trade.prodora.app",
    pathname: "/potvrda/token",
  });
  assert.equal(storeHostAction("prodora.app", "/login", domain), null);
  assert.equal(storeHostAction("prodora.app", "/shop/www", domain), null);
});

test("public addresses use the shop host", () => {
  assert.equal(publicStoreUrl("mesara-pajic", domain), "https://mesara-pajic.prodora.app");
  assert.equal(publicStoreUrl("mesara-pajic", "localhost"), "http://mesara-pajic.localhost:3000");
  assert.equal(
    publicConfirmationUrl("mesara-pajic", "token", domain),
    "https://mesara-pajic.prodora.app/potvrda/token",
  );
});
