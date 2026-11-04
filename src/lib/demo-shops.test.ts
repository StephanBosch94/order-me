import assert from "node:assert/strict";
import test from "node:test";

import { accountMailRecipient, DEMO_INBOX, mailRecipient } from "@/lib/demo-shops";

test("demo shop mail goes to the test inbox", () => {
  assert.equal(mailRecipient("mesara-pajic", "jelena@kaficluna.rs"), DEMO_INBOX);
  assert.equal(mailRecipient("mercis-atelier", "jovana@mercisatelier.rs"), DEMO_INBOX);
  assert.equal(mailRecipient("sava-trade", "porudzbine@savatrade.rs"), DEMO_INBOX);
  assert.equal(mailRecipient("sava-trade", "milan.kostic@savatrade.rs"), DEMO_INBOX);
  assert.equal(mailRecipient("sava-trade", "petar@restoranmorava.rs"), DEMO_INBOX);
  assert.equal(mailRecipient("sava-trade", "jovana@bistroreka.rs"), "jovana@bistroreka.rs");
  assert.equal(accountMailRecipient("ana@mesarapajic.rs"), DEMO_INBOX);
  assert.equal(accountMailRecipient("milan.kostic@savatrade.rs"), DEMO_INBOX);
  assert.equal(accountMailRecipient("petar@restoranmorava.rs"), DEMO_INBOX);
});
