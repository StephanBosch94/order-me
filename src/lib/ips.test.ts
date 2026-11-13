import assert from "node:assert/strict";
import test from "node:test";

import { formatIpsAccount, ipsPayload, ipsPurpose, parseIpsAccount } from "@/lib/ips";
import { organizationSchema } from "@/lib/validators";

const ACCOUNT = "160000000001111114";
const DASHED = "160-0000000011111-14";

test("accepts a dashed current account and an IPS string from the bank", () => {
  assert.equal(parseIpsAccount(""), "");
  assert.equal(parseIpsAccount(`  ${DASHED} `), ACCOUNT);
  assert.equal(parseIpsAccount(`K:PR|V:01|C:1|R:${ACCOUNT}|N:Mesara`), ACCOUNT);
  assert.equal(parseIpsAccount("160-0000000011111-45"), null);
  assert.equal(parseIpsAccount("nije racun"), null);
});

test("builds the NBS payload for the order amount", () => {
  const payload = ipsPayload({
    account: DASHED,
    recipient: "Mesara Pajić",
    amountPara: 125050,
    orderNumber: "PU-2026-1001",
  });
  assert.equal(
    payload,
    `K:PR|V:01|C:1|R:${ACCOUNT}|N:Mesara Pajić|I:RSD1250,50|SF:221|S:${ipsPurpose("PU-2026-1001")}|RO:0020261001`,
  );
  assert.equal(formatIpsAccount(ACCOUNT), DASHED);
  assert.equal(ipsPayload({ account: "123", recipient: "A", amountPara: 100, orderNumber: "1" }), null);
});

test("settings keep a valid IPS code and reject a broken one", () => {
  const base = {
    name: "Mesara",
    slug: "mesara",
    email: "a@mesara.rs",
    notificationEmail: "a@mesara.rs",
    phone: "",
    address: "",
    city: "",
    pib: "",
    mb: "",
    logoUrl: "",
    brandColor: "",
    description: "",
    trade: "",
    audience: "oba",
  };
  const saved = organizationSchema.safeParse({ ...base, ipsAccount: DASHED });
  assert.equal(saved.success, true);
  if (saved.success) assert.equal(saved.data.ipsAccount, ACCOUNT);
  const empty = organizationSchema.safeParse({ ...base, ipsAccount: "  " });
  assert.equal(empty.success, true);
  if (empty.success) assert.equal(empty.data.ipsAccount, "");
  const rejected = organizationSchema.safeParse({ ...base, ipsAccount: "160-0000000011111-45" });
  assert.equal(rejected.success, false);
});
