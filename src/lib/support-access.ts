import { createHmac, timingSafeEqual } from "node:crypto";

import { requireSessionSecret } from "@/lib/session-token";

export const SUPPORT_COOKIE = "vendro_support";
const SUPPORT_MS = 2 * 60 * 60 * 1000;

export type SupportGrant = {
  adminId: string;
  organizationId: string;
  auditId: string;
  exp: number;
};

export function signSupportGrant(adminId: string, organizationId: string, now = Date.now(), auditId = "") {
  if (!adminId || !organizationId) {
    throw new Error("Pristup podrške mora imati admina i prodavnicu.");
  }
  const payload = Buffer.from(
    JSON.stringify({ adminId, organizationId, auditId, exp: now + SUPPORT_MS } satisfies SupportGrant),
    "utf8",
  ).toString("base64url");
  const signature = createHmac("sha256", requireSessionSecret()).update(payload).digest("base64url");
  return `v1.${payload}.${signature}`;
}

export function readSupportGrant(token: string, now = Date.now()): SupportGrant | null {
  const [version, payload, signature] = token.split(".");
  if (version !== "v1" || !payload || !signature || token.split(".").length !== 3) return null;
  const expected = createHmac("sha256", requireSessionSecret()).update(payload).digest("base64url");
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      adminId?: unknown;
      organizationId?: unknown;
      auditId?: unknown;
      exp?: unknown;
    };
    if (typeof parsed.adminId !== "string" || parsed.adminId.length === 0) return null;
    if (typeof parsed.organizationId !== "string" || parsed.organizationId.length === 0) return null;
    if (typeof parsed.auditId !== "string") return null;
    if (typeof parsed.exp !== "number" || parsed.exp <= now) return null;
    return { adminId: parsed.adminId, organizationId: parsed.organizationId, auditId: parsed.auditId, exp: parsed.exp };
  } catch {
    return null;
  }
}
