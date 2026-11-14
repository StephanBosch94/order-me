import { NextResponse } from "next/server";

import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { createDemoSessionToken } from "@/lib/demo-entry";
import { demoEntryDestination, type DemoRole } from "@/lib/demo-shops";

function requestHost(request: Request, fallback: string) {
  const forwarded = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? fallback;
  return forwarded.split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? "";
  const role: DemoRole = url.searchParams.get("role") === "kupac" ? "kupac" : "prodavac";
  const token = await createDemoSessionToken(slug, role);
  const host = requestHost(request, url.hostname);
  const proto = (request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "")).split(",")[0]?.trim() || "https";
  const destination = demoEntryDestination(host, slug, role, Boolean(token));
  const target = new URL(destination, `${proto}://${host || url.host}`);
  // An explicit empty query stops the host from appending the sign-in parameters.
  const response = NextResponse.redirect(`${target.origin}${target.pathname}?`);
  if (token) response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
