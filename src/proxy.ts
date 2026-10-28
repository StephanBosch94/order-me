import { NextResponse, type NextRequest } from "next/server";

const protectedRoots = ["/dashboard", "/orders", "/products", "/customers", "/settings"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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

  return NextResponse.next();
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
    "/settings",
    "/settings/:path*",
  ],
};
