import assert from "node:assert/strict";
import test from "node:test";

import { parseProductCsv } from "@/lib/csv";

test("parses semicolon CSV with Serbian decimals", () => {
  const csv = "naziv;jedinica;cena\nPapirna čaša;komad;4,50\n";
  const parsed = parseProductCsv(csv);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.rows[0]?.name, "Papirna čaša");
  assert.equal(parsed.rows[0]?.pricePara, 450);
  assert.equal(parsed.rows[0]?.unit, "komad");
});

test("reports an invalid unit", () => {
  const parsed = parseProductCsv("naziv,jedinica,cena\nKutija,metar,10\n");
  assert.equal(parsed.rows.length, 0);
  assert.equal(parsed.errors[0]?.message, "Jedinica mere nije prepoznata.");
});
