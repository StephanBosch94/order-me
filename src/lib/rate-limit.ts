import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { getDataMode } from "@/lib/config";
import { getServiceClient } from "@/lib/supabase/admin";

export async function requestFingerprint() {
  const values = await headers();
  const ip =
    values.get("x-nf-client-connection-ip") ||
    values.get("cf-connecting-ip") ||
    values.get("x-real-ip") ||
    values.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    "unknown";
  return digest(ip);
}

export async function consumeActionLimit(
  namespace: string,
  identity: string,
  limit: number,
  windowSeconds: number,
) {
  if (getDataMode() !== "supabase") return true;
  const bucket = `${namespace}:${digest(identity.trim().toLowerCase())}`;
  const result = await getServiceClient().rpc("consume_rate_limit", {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (result.error) {
    console.error("[rate-limit]", result.error.message);
    return false;
  }
  return result.data === true;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
