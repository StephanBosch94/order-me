import assert from "node:assert/strict";
import test from "node:test";

import { emailDocument, emailLogoUrl, orderLinesHtml, orderLinesText } from "@/lib/email/template";

const lines = [
  { name: "Petrovačka kobasica", quantity: 2, unit: "kilogram" as const, lineTotalPara: 290000 },
  { name: "Suva kobasica", quantity: 1, unit: "komad" as const, lineTotalPara: 89000 },
];

test("a shop logo path becomes an absolute mail address", () => {
  assert.equal(
    emailLogoUrl("/suppliers/mesara-pajic-logo.jpg", "https://vendro-app.netlify.app"),
    "https://vendro-app.netlify.app/suppliers/mesara-pajic-logo.jpg",
  );
  assert.equal(emailLogoUrl("https://cdn.example/logo.png", "https://vendro-app.netlify.app"), "https://cdn.example/logo.png");
  assert.equal(emailLogoUrl("", "https://vendro-app.netlify.app"), null);
});

test("an order mail lists each product and the order total", () => {
  const html = emailDocument({
    name: "Mesara Pajić",
    logoUrl: "https://vendro-app.netlify.app/suppliers/mesara-pajic-logo.jpg",
    title: "Potvrda porudžbine PU-2026-1019",
    bodyHtml: orderLinesHtml(lines, 379000),
  });
  assert.match(html, /src="https:\/\/vendro-app\.netlify\.app\/suppliers\/mesara-pajic-logo\.jpg"/);
  assert.match(html, /alt="Mesara Pajić"/);
  assert.match(html, /Petrovačka kobasica/);
  assert.match(html, /2 kilogram/);
  assert.match(html, /2\.900,00 RSD/);
  assert.match(html, /Suva kobasica/);
  assert.match(html, /1 komad/);
  assert.match(html, /890,00 RSD/);
  assert.match(html, /Ukupno/);
  assert.match(html, /3\.790,00 RSD/);
  assert.equal(
    orderLinesText(lines),
    "Petrovačka kobasica · 2 kilogram · 2.900,00 RSD\nSuva kobasica · 1 komad · 890,00 RSD",
  );
});

test("a shop without a logo still shows its initials", () => {
  const html = emailDocument({
    name: "Mesara Pajić",
    logoUrl: null,
    title: "Nova porudžbina",
    bodyHtml: "",
  });
  assert.equal(html.includes("<img"), false);
  assert.match(html, />MP</);
});
