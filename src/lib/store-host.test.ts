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

test("Sava Trade is served at savatrade.vendro.rs", () => {
  assert.equal(shopSlugFromHostname("savatrade.vendro.rs"), "sava-trade");
  assert.equal(shopSlugFromHostname("savatrade.vendro.rs:443"), "sava-trade");
  assert.deepEqual(storeHostAction("savatrade.vendro.rs", "/"), {
    type: "rewrite",
    pathname: "/shop/sava-trade",
  });
  assert.deepEqual(storeHostAction("savatrade.vendro.rs", "/porudzbine"), {
    type: "rewrite",
    pathname: "/shop/sava-trade/porudzbine",
  });
  assert.deepEqual(storeHostAction("savatrade.vendro.rs", "/potvrda/token"), {
    type: "rewrite",
    pathname: "/s/sava-trade/potvrda/token",
  });
  assert.deepEqual(storeHostAction("savatrade.vendro.rs", "/shop/sava-trade"), {
    type: "redirect",
    hostname: "savatrade.vendro.rs",
    pathname: "/",
  });
  assert.deepEqual(storeHostAction("vendro.rs", "/shop/sava-trade", null), {
    type: "redirect",
    hostname: "savatrade.vendro.rs",
    pathname: "/",
  });
  assert.deepEqual(storeHostAction("www.vendro.rs", "/shop/sava-trade/proizvod/abc", null), {
    type: "redirect",
    hostname: "savatrade.vendro.rs",
    pathname: "/proizvod/abc",
  });
  assert.deepEqual(storeHostAction("vendro.rs", "/s/sava-trade/potvrda/token", null), {
    type: "redirect",
    hostname: "savatrade.vendro.rs",
    pathname: "/potvrda/token",
  });
  assert.equal(storeHostAction("vendro.rs", "/shop/mesara-pajic", null), null);
  assert.deepEqual(storeHostAction("sava-trade.vendro.rs", "/porudzbine", "vendro.rs"), {
    type: "redirect",
    hostname: "savatrade.vendro.rs",
    pathname: "/porudzbine",
  });
  assert.equal(publicStoreUrl("sava-trade", null), "https://savatrade.vendro.rs");
  assert.equal(publicStoreUrl("sava-trade", "vendro.rs"), "https://savatrade.vendro.rs");
  assert.equal(publicConfirmationUrl("sava-trade", "token", null), "https://savatrade.vendro.rs/potvrda/token");
});

test("every shop on vendro.rs uses its own host", () => {
  const vendro = "vendro.rs";
  assert.deepEqual(storeHostAction("vendro.rs", "/shop/mesara-pajic", vendro), {
    type: "redirect",
    hostname: "mesara-pajic.vendro.rs",
    pathname: "/",
  });
  assert.deepEqual(storeHostAction("www.vendro.rs", "/shop/mercis-atelier/porudzbine", vendro), {
    type: "redirect",
    hostname: "mercis-atelier.vendro.rs",
    pathname: "/porudzbine",
  });
  assert.deepEqual(storeHostAction("mesara-pajic.vendro.rs", "/", vendro), {
    type: "rewrite",
    pathname: "/shop/mesara-pajic",
  });
  assert.deepEqual(storeHostAction("mercis-atelier.vendro.rs", "/proizvod/abc", vendro), {
    type: "rewrite",
    pathname: "/shop/mercis-atelier/proizvod/abc",
  });
  assert.deepEqual(storeHostAction("vendro.rs", "/shop/sava-trade", vendro), {
    type: "redirect",
    hostname: "savatrade.vendro.rs",
    pathname: "/",
  });
  assert.deepEqual(storeHostAction("vendro.rs", "/s/mesara-pajic/potvrda/token", vendro), {
    type: "redirect",
    hostname: "mesara-pajic.vendro.rs",
    pathname: "/potvrda/token",
  });
  assert.equal(storeHostAction("vendro.rs", "/login", vendro), null);
  assert.equal(publicStoreUrl("mesara-pajic", vendro), "https://mesara-pajic.vendro.rs");
  assert.equal(publicStoreUrl("mercis-atelier", vendro), "https://mercis-atelier.vendro.rs");
  assert.equal(
    publicConfirmationUrl("mesara-pajic", "token", vendro),
    "https://mesara-pajic.vendro.rs/potvrda/token",
  );
});

test("public addresses use the shop host", () => {
  assert.equal(publicStoreUrl("mesara-pajic", domain), "https://mesara-pajic.vendro.app");
  assert.equal(publicStoreUrl("mesara-pajic", "localhost"), "http://mesara-pajic.localhost:3000");
  assert.equal(
    publicConfirmationUrl("mesara-pajic", "token", domain),
    "https://mesara-pajic.vendro.app/potvrda/token",
  );
});
