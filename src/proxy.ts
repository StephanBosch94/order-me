import { NextResponse, type NextRequest } from "next/server";

import { REQUEST_PATH_HEADER } from "@/lib/order-link";
import { readDemoSessionCarry } from "@/lib/session-token";

const protectedRoots = ["/dashboard", "/orders", "/products", "/customers", "/zaposleni", "/settings", "/invoices", "/nalog", "/kupac", "/platform"];

export function proxy(request: NextRequest) {
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
    "/dashboard",
    "/dashboard/:path*",
    "/orders",
    "/orders/:path*",
    "/products",
    "/products/:path*",
    "/customers",
    "/customers/:path*",
    "/zaposleni",
    "/zaposleni/:path*",
    "/settings",
    "/settings/:path*",
    "/nalog",
    "/nalog/:path*",
    "/kupac",
    "/kupac/:path*",
    "/invoices",
    "/invoices/:path*",
    "/platform",
    "/platform/:path*",
  ],
};
