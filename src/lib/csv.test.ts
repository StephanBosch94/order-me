import assert from "node:assert/strict";
import test from "node:test";

import { parseCustomerCsv, parseProductCsv } from "@/lib/csv";

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

test("parses a customer CSV and tells a company from a person", () => {
  const csv = [
    "naziv;email;telefon;pib;vrsta;odlozeno_placanje",
    "Pekara Zrno;pekara@example.rs;060111222;123456789;Pravno lice;30",
    "Milica Radić;milica@example.rs;0694412280;;Fizičko lice;",
  ].join("\n");
  const parsed = parseCustomerCsv(csv);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.rows[0]?.party, "pravna");
  assert.equal(parsed.rows[0]?.paymentTermDays, 30);
  assert.equal(parsed.rows[0]?.contactName, "Pekara Zrno");
  assert.equal(parsed.rows[1]?.party, "fizicka");
  assert.equal(parsed.rows[1]?.paymentTermDays, 0);
  assert.equal(parsed.rows[1]?.contactName, "Milica Radić");
});

test("rejects a repeated customer email and a missing header", () => {
  const repeated = parseCustomerCsv(
    "naziv,email,telefon\nAna,ana@example.rs,060111222\nAna,ana@example.rs,060111223\n",
  );
  assert.equal(repeated.rows.length, 1);
  assert.equal(repeated.errors[0]?.message, "Email se ponavlja u fajlu.");
  const header = parseCustomerCsv("naziv,grad\nAna,Niš\n");
  assert.equal(header.rows.length, 0);
  assert.equal(header.errors[0]?.message, "Zaglavlje mora sadržati kolone naziv, email i telefon.");
});
