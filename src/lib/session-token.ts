import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_MS = 14 * 24 * 60 * 60 * 1000;
const DEMO_SECRET = "prodora-demo-session-v1";

function sessionSecret() {
  return process.env.SESSION_SECRET?.trim() || DEMO_SECRET;
}

export function signDemoSession(userId: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ userId, exp: now + SESSION_MS }), "utf8").toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `v1.${payload}.${signature}`;
}

export function readDemoSession(token: string, now = Date.now()) {
  const [version, payload, signature] = token.split(".");
  if (version !== "v1" || !payload || !signature || token.split(".").length !== 3) return null;
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId?: unknown; exp?: unknown };
    if (typeof parsed.userId !== "string" || parsed.userId.length === 0) return null;
    if (typeof parsed.exp !== "number" || parsed.exp <= now) return null;
    return parsed.userId;
  } catch {
    return null;
  }
}
