import { NextResponse } from "next/server";

import { authScopeCookie, parentAuthClearHeaders, vendroHost } from "@/lib/auth-cookie";

function destination(request: Request) {
  const next = new URL(request.url).searchParams.get("next");
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/auth/kolacici")) {
    return new URL(next, request.url);
  }
  return new URL("/dashboard", request.url);
}

/** Drop the shared vendro.rs auth cookie, then continue. The signed-in cookie stays on this host. */
export function GET(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const response = NextResponse.redirect(destination(request));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.append("Set-Cookie", authScopeCookie(vendroHost(host)));
  if (vendroHost(host)) {
    for (const clear of parentAuthClearHeaders(request.headers.get("cookie") ?? "")) {
      response.headers.append("Set-Cookie", clear);
    }
  }
  return response;
}
