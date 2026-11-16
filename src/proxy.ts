import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { REQUEST_PATH_HEADER } from "@/lib/order-link";
import { readDemoSessionCarry, requireSessionSecret } from "@/lib/session-token";
import { storeHostAction } from "@/lib/store-host";

const protectedRoots = ["/dashboard", "/orders", "/products", "/customers", "/zaposleni", "/settings", "/invoices", "/nalog", "/kupac", "/platform"];

type PendingCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

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

function withCookies(response: NextResponse, cookies: PendingCookie[]) {
  for (const cookie of cookies) response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}

async function supabaseUser(request: NextRequest, pending: PendingCookie[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return null;
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        pending.splice(0, pending.length, ...cookiesToSet);
        for (const cookie of cookiesToSet) request.cookies.set(cookie.name, cookie.value);
      },
    },
  });
  try {
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  requireSessionSecret();
  const pending: PendingCookie[] = [];
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const user = supabaseConfigured ? await supabaseUser(request, pending) : null;

  const hosted = storeHostResponse(request);
  if (hosted) return withCookies(hosted, pending);

  const { pathname } = request.nextUrl;
  // Catalog photos live under /products/*.jpg and must stay public.
  if (/\.[a-z0-9]+$/i.test(pathname)) return withCookies(NextResponse.next(), pending);

  const isProtected = protectedRoots.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );
  if (!isProtected) return withCookies(NextResponse.next(), pending);

  const hasSession = supabaseConfigured
    ? Boolean(user)
    : Boolean(request.cookies.get("poruci_session")?.value);

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return withCookies(NextResponse.redirect(url), pending);
  }

  const orderId = pathname.match(/^\/orders\/([^/]+)$/)?.[1];
  if (orderId && !supabaseConfigured) {
    const token = request.cookies.get("poruci_session")?.value ?? "";
    const carry = token ? readDemoSessionCarry(token) : null;
    if (carry?.user.kind === "buyer") {
      const url = request.nextUrl.clone();
      url.pathname = `/narudzbina/${orderId}`;
      url.search = "";
      return withCookies(NextResponse.redirect(url), pending);
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_PATH_HEADER, pathname);
  return withCookies(NextResponse.next({ request: { headers: requestHeaders } }), pending);
}

export const config = {
  matcher: [
    // Shop hosts and /shop links are rewritten here. Skip Next assets and files with an extension.
    "/((?!_next/static|_next/image|.*\\..*).*)",
  ],
};
