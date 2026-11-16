import assert from "node:assert/strict";
import test from "node:test";

import { absoluteUrl, metaDescription, organizationJsonLd, schemaPrice, shopDescription } from "./seo";

test("a site path becomes an absolute address", () => {
  assert.equal(absoluteUrl("/brand/vendro-logo.png", "https://vendro.rs"), "https://vendro.rs/brand/vendro-logo.png");
  assert.equal(absoluteUrl("https://cdn.example/logo.png", "https://vendro.rs"), "https://cdn.example/logo.png");
  assert.equal(absoluteUrl("/", "https://vendro.rs/"), "https://vendro.rs");
});

test("a long shop description stays within a search snippet", () => {
  const description = shopDescription({
    name: "Nova radnja",
    city: "Novi Sad",
    description: "A".repeat(200),
  });
  assert.equal(description.length <= 160, true);
  assert.equal(description.endsWith("…"), true);
  assert.equal(
    shopDescription({ name: "Nova radnja", city: "Novi Sad", description: "" }),
    "Nova radnja, Novi Sad, prima porudžbine online. Cenovnik i potvrda u dinarima.",
  );
});

test("a price in para becomes dinars for structured data", () => {
  assert.equal(schemaPrice(89000), "890.00");
  assert.equal(metaDescription("Kratko.", "Rezerva"), "Kratko.");
});

test("the homepage names Vendro and its address", () => {
  const data = organizationJsonLd("https://vendro.rs");
  const graph = data["@graph"] as { "@type": string; name: string; url: string }[];
  assert.equal(graph[0]?.name, "Vendro");
  assert.equal(graph[0]?.url, "https://vendro.rs");
  assert.equal(graph[1]?.["@type"], "WebSite");
});
