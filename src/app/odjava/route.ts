import { NextResponse } from "next/server";

import { parentAuthClearHeaders, vendroHost } from "@/lib/auth-cookie";
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
  const login = new URL("/login", request.url);
  const shop = shopPath(new URL(request.url).searchParams.get("next"));
  if (shop) login.searchParams.set("next", shop);
  const response = NextResponse.redirect(login, 303);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (vendroHost(host)) {
    for (const clear of parentAuthClearHeaders(request.headers.get("cookie") ?? "")) {
      response.headers.append("Set-Cookie", clear);
    }
  }
  return response;
}

function shopPath(value: string | null) {
  if (!value || !value.startsWith("/shop/")) return null;
  let slug = value.slice("/shop/".length);
  try {
    slug = decodeURIComponent(slug);
  } catch {
    return null;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) return null;
  return `/shop/${slug}`;
}

export function GET(request: Request) {
  return endSession(request);
}

export function POST(request: Request) {
  return endSession(request);
}
