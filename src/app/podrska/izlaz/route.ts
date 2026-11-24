import { NextRequest, NextResponse } from "next/server";

import { supportCookieOptions } from "@/lib/auth";
import { getDataMode } from "@/lib/config";
import { readSupportGrant, SUPPORT_COOKIE } from "@/lib/support-access";

export async function GET(request: NextRequest) {
  const grant = readSupportGrant(request.cookies.get(SUPPORT_COOKIE)?.value ?? "");
  if (grant?.auditId && grant.auditId !== "demo" && getDataMode() === "supabase") {
    const { getServiceClient } = await import("@/lib/supabase/admin");
    await getServiceClient()
      .from("support_access_log")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", grant.auditId)
      .eq("admin_user_id", grant.adminId);
  }
  const response = NextResponse.redirect(new URL("/platform", request.url), 303);
  response.cookies.set(SUPPORT_COOKIE, "", { ...supportCookieOptions(), maxAge: 0 });
  return response;
}
