import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function newStaffInviteToken() {
  return randomBytes(32).toString("base64url");
}

export function staffInviteTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function staffInviteMatches(token: string, hash: string) {
  const actual = Buffer.from(staffInviteTokenHash(token));
  const expected = Buffer.from(hash);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function staffInviteExpiry(now = Date.now()) {
  return new Date(now + WEEK_MS).toISOString();
}

/** Link in the staff mail. The person opens it and chooses a password. */
export function staffInviteUrl(appUrl: string, token: string, type: "invite" | "recovery") {
  const url = new URL("/auth/pozivnica", appUrl);
  url.searchParams.set("token", token);
  url.searchParams.set("type", type);
  return url.toString();
}
