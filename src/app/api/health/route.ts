import { NextResponse } from "next/server";

import { getDataMode } from "@/lib/config";

export const dynamic = "force-dynamic";

/** Lightweight uptime probe. Checks that production can reach Supabase. */
export async function GET() {
  const started = Date.now();
  try {
    if (getDataMode() !== "supabase") {
      return NextResponse.json(
        { ok: false, mode: "demo", ms: Date.now() - started },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    const { getServiceClient } = await import("@/lib/supabase/admin");
    const admin = getServiceClient();
    const { error } = await admin.from("organizations").select("id").limit(1);
    if (error) {
      return NextResponse.json(
        { ok: false, mode: "supabase", ms: Date.now() - started },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { ok: true, mode: "supabase", ms: Date.now() - started },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, ms: Date.now() - started },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
