import assert from "node:assert/strict";
import test from "node:test";

import { addCalendarDays, formatDate, parseRsdToPara } from "@/lib/format";
import { orderPrefixFromName, slugCandidate, slugify } from "@/lib/text";

test("parses Serbian and plain prices into para", () => {
  assert.equal(parseRsdToPara("1.250,50"), 125050);
  assert.equal(parseRsdToPara("1250.50"), 125050);
  assert.equal(parseRsdToPara("8,5"), 850);
  assert.equal(parseRsdToPara("85"), 8500);
  assert.equal(parseRsdToPara("1.250"), 125000);
  assert.equal(parseRsdToPara(""), null);
});

test("adds calendar days in Belgrade", () => {
  const start = "2026-11-02T10:00:00.000Z";
  assert.equal(formatDate(addCalendarDays(start, 0)), "02. 11. 2026.");
  assert.equal(formatDate(addCalendarDays(start, 15)), "17. 11. 2026.");
  assert.equal(formatDate(addCalendarDays("2026-01-31T10:00:00.000Z", 1)), "01. 02. 2026.");
});

test("slugifies Serbian names", () => {
  assert.equal(slugify("Gastro Supply"), "gastro-supply");
  assert.equal(slugify("Moja Čaša"), "moja-casa");
  assert.equal(slugCandidate("Gastro Supply", 1), "gastro-supply");
  assert.equal(slugCandidate("Gastro Supply", 2), "gastro-supply-2");
  assert.equal(slugCandidate("!", 1), "firma");
  assert.equal(orderPrefixFromName("Gastro Supply"), "GS");
});
