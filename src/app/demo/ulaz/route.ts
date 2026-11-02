import { NextResponse } from "next/server";

import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { createDemoSessionToken } from "@/lib/demo-entry";
import type { DemoRole } from "@/lib/demo-shops";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? "";
  const role: DemoRole = url.searchParams.get("role") === "kupac" ? "kupac" : "prodavac";
  const token = await createDemoSessionToken(slug, role);
  const destination = token && role === "prodavac" ? "/dashboard" : token ? `/shop/${slug}` : "/";
  const response = NextResponse.redirect(new URL(destination, url));
  if (token) response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
