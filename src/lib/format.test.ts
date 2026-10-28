import assert from "node:assert/strict";
import test from "node:test";

import { parseRsdToPara } from "@/lib/format";
import { orderPrefixFromName, slugify } from "@/lib/text";

test("parses Serbian and plain prices into para", () => {
  assert.equal(parseRsdToPara("1.250,50"), 125050);
  assert.equal(parseRsdToPara("1250.50"), 125050);
  assert.equal(parseRsdToPara("8,5"), 850);
  assert.equal(parseRsdToPara("85"), 8500);
  assert.equal(parseRsdToPara("1.250"), 125000);
  assert.equal(parseRsdToPara(""), null);
});

test("slugifies Serbian names", () => {
  assert.equal(slugify("Gastro Supply"), "gastro-supply");
  assert.equal(slugify("Moja Čaša"), "moja-casa");
  assert.equal(orderPrefixFromName("Gastro Supply"), "GS");
});
