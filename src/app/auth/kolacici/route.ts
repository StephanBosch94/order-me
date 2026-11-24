import { NextResponse } from "next/server";

function destination(request: Request) {
  const next = new URL(request.url).searchParams.get("next");
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/auth/kolacici")) {
    return new URL(next, request.url);
  }
  return new URL("/dashboard", request.url);
}

/** Legacy hop. Keep the shared .vendro.rs session and continue. */
export function GET(request: Request) {
  const response = NextResponse.redirect(destination(request));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
