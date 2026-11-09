import { NextResponse, type NextRequest } from "next/server";

import { REQUEST_PATH_HEADER } from "@/lib/order-link";
import { readDemoSessionCarry } from "@/lib/session-token";
import { storeHostAction } from "@/lib/store-host";

const protectedRoots = ["/dashboard", "/orders", "/products", "/customers", "/zaposleni", "/settings", "/invoices", "/nalog", "/kupac", "/platform"];

function requestHostname(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const host = forwarded.split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
  return host || request.nextUrl.hostname;
}

function storeHostResponse(request: NextRequest) {
  const action = storeHostAction(requestHostname(request), request.nextUrl.pathname);
  if (!action) return null;
  const url = request.nextUrl.clone();
  url.pathname = action.pathname;
  if (action.type === "redirect") {
    url.hostname = action.hostname;
    return NextResponse.redirect(url);
  }
  return NextResponse.rewrite(url);
}

export function proxy(request: NextRequest) {
  const hosted = storeHostResponse(request);
  if (hosted) return hosted;

  const { pathname } = request.nextUrl;
  // Catalog photos live under /products/*.jpg and must stay public.
  if (/\.[a-z0-9]+$/i.test(pathname)) return NextResponse.next();
  const isProtected = protectedRoots.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );
  if (!isProtected) return NextResponse.next();

  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const hasSession = supabaseConfigured
    ? request.cookies.getAll().some((cookie) => cookie.name.includes("auth-token"))
    : Boolean(request.cookies.get("poruci_session")?.value);

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const orderId = pathname.match(/^\/orders\/([^/]+)$/)?.[1];
  if (orderId && !supabaseConfigured) {
    const token = request.cookies.get("poruci_session")?.value ?? "";
    const carry = token ? readDemoSessionCarry(token) : null;
    if (carry?.user.kind === "buyer") {
      const url = request.nextUrl.clone();
      url.pathname = `/narudzbina/${orderId}`;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_PATH_HEADER, pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    // Shop hosts and /shop links are rewritten here. Skip Next assets and files with an extension.
    "/((?!_next/static|_next/image|.*\\..*).*)",
  ],
};
