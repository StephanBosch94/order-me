import assert from "node:assert/strict";
import test from "node:test";

import { buildSalesInvoiceUbl, SEF_CUSTOMIZATION_ID } from "@/lib/efaktura/ubl";
import { postSalesInvoice, salesInvoiceUrl } from "@/lib/efaktura/send";

const draft = {
  number: "PU-2026-1001",
  issueDate: "2026-11-02",
  dueDate: "2026-11-17",
  deliveryDate: "2026-11-02",
  supplier: {
    name: "Mesara Pajić",
    pib: "109876543",
    mb: "21456789",
    address: "Jarmočna 20",
    city: "Bački Petrovac",
    postalCode: "",
    email: "porudzbine@mesarapajic.rs",
    phone: "+381 21 555 0142",
  },
  customer: {
    name: "Restoran Dunav & sinovi",
    pib: "108765432",
    mb: "",
    address: "Bulevar kralja Aleksandra 142",
    city: "Beograd",
    postalCode: "11000",
    email: "marko@restorandunav.rs",
    phone: "+381 63 111 2200",
  },
  lines: [
    {
      name: "Suva kobasica",
      sku: "MP-SKOB",
      unit: "komad" as const,
      quantity: 4,
      unitPricePara: 89000,
      lineTotalPara: 356000,
    },
  ],
};

test("sales invoice UBL follows the SEF srbdt shape and does not calculate VAT", () => {
  const xml = buildSalesInvoiceUbl(draft);
  assert.match(xml, new RegExp(SEF_CUSTOMIZATION_ID.replaceAll(":", "\\:")));
  assert.match(xml, /<cbc:InvoiceTypeCode>380<\/cbc:InvoiceTypeCode>/);
  assert.match(xml, /<cbc:ID>PU-2026-1001<\/cbc:ID>/);
  assert.match(xml, /<cbc:ActualDeliveryDate>2026-11-02<\/cbc:ActualDeliveryDate>/);
  assert.doesNotMatch(xml, /DescriptionCode/);
  assert.match(xml, /<cbc:ID>O<\/cbc:ID>/);
  assert.match(xml, /PDV nije obračunat/);
  assert.match(xml, /schemeID="9948">109876543</);
  assert.match(xml, /schemeID="9948">108765432</);
  assert.match(xml, /<cbc:CompanyID>RS109876543<\/cbc:CompanyID>/);
  assert.match(xml, /<cbc:CompanyID>RS108765432<\/cbc:CompanyID>/);
  assert.match(xml, /<cbc:CompanyID>NO-VAT<\/cbc:CompanyID>/);
  assert.match(xml, /unitCode="H87">4</);
  assert.match(xml, /Restoran Dunav &amp; sinovi/);
  assert.match(xml, /<cbc:PayableAmount currencyID="RSD">3560.00<\/cbc:PayableAmount>/);
  assert.match(xml, /<cbc:PostalZone>11000<\/cbc:PostalZone>/);
});

test("the sales invoice URL is the documented demo host unless production is selected", () => {
  assert.equal(
    salesInvoiceUrl("demo", "req-1").toString(),
    "https://demoefaktura.mfin.gov.rs/api/publicApi/sales-invoice/ubl?requestId=req-1&sendToCir=No",
  );
  assert.equal(
    salesInvoiceUrl("produkcija", "req-2").origin,
    "https://efaktura.mfin.gov.rs",
  );
});

test("an empty API key never calls the network", async () => {
  let called = false;
  const result = await postSalesInvoice({
    environment: "demo",
    apiKey: "   ",
    xml: "<Invoice/>",
    requestId: "req-1",
    fetchImpl: async () => {
      called = true;
      return new Response("{}", { status: 200 });
    },
  });
  assert.equal(called, false);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /Podešavanjima/);
});

test("a successful import stores the sales invoice id from the documented response", async () => {
  const result = await postSalesInvoice({
    environment: "demo",
    apiKey: "kljuc-za-test",
    xml: "<Invoice/>",
    requestId: "req-9",
    fetchImpl: async (url, init) => {
      assert.equal(new URL(String(url)).pathname, "/api/publicApi/sales-invoice/ubl");
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("ApiKey"), "kljuc-za-test");
      assert.equal(headers.get("Content-Type"), "application/xml");
      return new Response(
        JSON.stringify({ InvoiceId: 20584, PurchaseInvoiceId: 20584, SalesInvoiceId: 23288 }),
        { status: 200 },
      );
    },
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.invoiceId, "23288");
});
