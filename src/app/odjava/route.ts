import { NextResponse } from "next/server";

import { clearDemoSession } from "@/lib/auth";
import { getDataMode } from "@/lib/config";

async function endSession(request: Request) {
  if (getDataMode() === "demo") {
    await clearDemoSession();
  } else {
    const { createSupabaseServer } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login", request.url), 303);
}

export function GET(request: Request) {
  return endSession(request);
}

export function POST(request: Request) {
  return endSession(request);
}
