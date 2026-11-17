import { NextResponse } from "next/server";

import { supportCookieOptions } from "@/lib/auth";
import { SUPPORT_COOKIE } from "@/lib/support-access";

export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/platform", request.url), 303);
  response.cookies.set(SUPPORT_COOKIE, "", { ...supportCookieOptions(), maxAge: 0 });
  return response;
}
