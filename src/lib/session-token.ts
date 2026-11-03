import { createHmac, timingSafeEqual } from "node:crypto";

import type { DemoMembership, DemoUser } from "@/lib/data/seed";
import type { Organization } from "@/lib/data/types";

const SESSION_MS = 14 * 24 * 60 * 60 * 1000;
const DEMO_SECRET = "prodora-demo-session-v1";

/** Account copy kept in the signed cookie so another Netlify instance can restore a new signup. */
export type SessionCarry = {
  user: DemoUser;
  organization?: Organization;
  member?: DemoMembership;
};

function sessionSecret() {
  return process.env.SESSION_SECRET?.trim() || DEMO_SECRET;
}

export function signDemoSession(userId: string, now = Date.now(), carry?: SessionCarry | null) {
  const body: { userId: string; exp: number; carry?: SessionCarry } = { userId, exp: now + SESSION_MS };
  if (carry?.user.id === userId) body.carry = carry;
  const payload = Buffer.from(JSON.stringify(body), "utf8").toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `v1.${payload}.${signature}`;
}

function readPayload(token: string, now: number) {
  const [version, payload, signature] = token.split(".");
  if (version !== "v1" || !payload || !signature || token.split(".").length !== 3) return null;
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      userId?: unknown;
      exp?: unknown;
      carry?: unknown;
    };
    if (typeof parsed.userId !== "string" || parsed.userId.length === 0) return null;
    if (typeof parsed.exp !== "number" || parsed.exp <= now) return null;
    return { userId: parsed.userId, carry: readCarry(parsed.carry, parsed.userId) };
  } catch {
    return null;
  }
}

export function readDemoSession(token: string, now = Date.now()) {
  return readPayload(token, now)?.userId ?? null;
}

export function readDemoSessionCarry(token: string, now = Date.now()) {
  return readPayload(token, now)?.carry ?? null;
}

function readCarry(value: unknown, userId: string): SessionCarry | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { user?: unknown; organization?: unknown; member?: unknown };
  const user = record.user;
  if (!user || typeof user !== "object") return null;
  const fields = user as DemoUser;
  if (fields.id !== userId || typeof fields.email !== "string" || typeof fields.name !== "string") return null;
  if (typeof fields.passwordHash !== "string" || typeof fields.createdAt !== "string") return null;
  if (fields.kind !== "supplier" && fields.kind !== "buyer" && fields.kind !== "platform") return null;
  const carry: SessionCarry = {
    user: {
      ...fields,
      businessName: typeof fields.businessName === "string" ? fields.businessName : "",
      phone: typeof fields.phone === "string" ? fields.phone : "",
      address: typeof fields.address === "string" ? fields.address : "",
      city: typeof fields.city === "string" ? fields.city : "",
      pib: typeof fields.pib === "string" ? fields.pib : "",
      bankAccount: typeof fields.bankAccount === "string" ? fields.bankAccount : "",
    },
  };
  const organization = record.organization;
  if (organization && typeof organization === "object") {
    const org = organization as Organization;
    if (typeof org.id === "string" && typeof org.slug === "string" && typeof org.name === "string") {
      carry.organization = { ...org, efakturaApiKey: "" };
    }
  }
  const member = record.member;
  if (member && typeof member === "object") {
    const row = member as DemoMembership;
    if (
      typeof row.id === "string" &&
      row.userId === userId &&
      typeof row.organizationId === "string" &&
      (row.role === "owner" || row.role === "admin" || row.role === "staff") &&
      typeof row.createdAt === "string" &&
      carry.organization?.id === row.organizationId
    ) {
      carry.member = { ...row };
    }
  }
  return carry;
}
