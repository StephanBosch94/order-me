import assert from "node:assert/strict";
import test from "node:test";

import { emailButton, emailDocument, emailLogoUrl, orderLinesHtml, orderLinesText, signupConfirmationEmail, staffInviteEmail } from "@/lib/email/template";
import { confirmedAccountUrl, signupConfirmUrl } from "@/lib/signup-confirm";
import { staffInviteUrl } from "@/lib/staff-invite";

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
    logoUrl: "https://vendro.rs/brand/vendro-logo.png",
    title: "Potvrda porudžbine PU-2026-1019",
    appUrl: "https://vendro.rs",
    bodyHtml: `${orderLinesHtml(lines, 379000)}${emailButton("https://vendro.rs/potvrda/abc", "Preuzmite PDF")}`,
  });
  assert.match(html, /src="https:\/\/vendro\.rs\/brand\/vendro-logo\.png"/);
  assert.match(html, /alt="Vendro"/);
  assert.match(html, /Petrovačka kobasica/);
  assert.match(html, /2 kilogram/);
  assert.match(html, /2\.900,00 RSD/);
  assert.match(html, /Suva kobasica/);
  assert.match(html, /1 komad/);
  assert.match(html, /890,00 RSD/);
  assert.match(html, /Ukupno/);
  assert.match(html, /3\.790,00 RSD/);
  assert.match(html, /bgcolor="#111111"/);
  assert.match(html, />Preuzmite PDF</);
  assert.equal(html.includes("biznis.jpg"), false);
  assert.equal(
    orderLinesText(lines),
    "Petrovačka kobasica · 2 kilogram · 2.900,00 RSD\nSuva kobasica · 1 komad · 890,00 RSD",
  );
});

test("a registration link confirms the address and keeps the return path", () => {
  assert.equal(
    signupConfirmUrl("https://vendro.rs", "abc", ""),
    "https://vendro.rs/auth/potvrda?token_hash=abc&type=signup",
  );
  assert.equal(
    signupConfirmUrl("https://vendro.rs", "abc", "/shop/sava-trade"),
    "https://vendro.rs/auth/potvrda?token_hash=abc&type=signup&next=%2Fshop%2Fsava-trade",
  );
  assert.equal(signupConfirmUrl("https://vendro.rs", "abc", "https://evil.test"), "https://vendro.rs/auth/potvrda?token_hash=abc&type=signup");
});

test("a confirmed supplier opens the shop dashboard", () => {
  assert.equal(confirmedAccountUrl("supplier", "nova-radnja", "/"), "/dashboard");
  assert.equal(confirmedAccountUrl("buyer", "nova-radnja", "/kupac"), "/kupac");
  assert.equal(confirmedAccountUrl("supplier", "", "/dashboard"), "/dashboard");
});

test("a registration confirmation shows the Vendro logo and the confirm link", () => {
  const message = signupConfirmationEmail({
    name: "Ana <script>",
    confirmUrl: "https://vendro.rs/auth/v1/verify?token=abc&type=signup",
    logoUrl: "https://vendro.rs/brand/vendro-logo.png",
    appUrl: "https://vendro.rs",
  });
  assert.equal(message.subject, "Potvrdite email adresu");
  assert.match(message.text, /Ana <script>,/);
  assert.match(message.text, /https:\/\/vendro\.rs\/auth\/v1\/verify\?token=abc&type=signup/);
  assert.match(message.html, /src="https:\/\/vendro\.rs\/brand\/vendro-logo\.png"/);
  assert.match(message.html, /alt="Vendro"/);
  assert.equal(message.html.includes("biznis.jpg"), false);
  assert.match(message.html, /Ana &lt;script&gt;,/);
  assert.match(message.html, /bgcolor="#111111"/);
  assert.match(message.html, />Potvrdite adresu</);
  assert.match(message.html, /href="https:\/\/vendro\.rs\/auth\/v1\/verify\?token=abc&amp;type=signup"/);
  assert.equal(message.html.includes("<script>"), false);
});

test("a staff invitation asks the person to choose a password", () => {
  const inviteUrl = staffInviteUrl("https://vendro.rs", "token-1", "invite");
  assert.equal(inviteUrl, "https://vendro.rs/auth/pozivnica?token=token-1&type=invite");
  const message = staffInviteEmail({
    name: "Stefan <b>",
    shopName: "Sava Trade",
    roleLabel: "Korisnik",
    inviteUrl,
    logoUrl: "https://vendro.rs/brand/vendro-logo.png",
    appUrl: "https://vendro.rs",
  });
  assert.equal(message.subject, "Pozivnica za Sava Trade");
  assert.match(message.text, /Napravite lozinku ovde:/);
  assert.equal(message.text.includes("Početna lozinka"), false);
  assert.match(message.html, />Napravite lozinku</);
  assert.match(message.html, /Stefan &lt;b&gt;/);
  assert.equal(message.html.includes("Početna lozinka"), false);
  assert.match(message.html, /bgcolor="#111111"/);
});
