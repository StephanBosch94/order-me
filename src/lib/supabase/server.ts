import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

import { authCookieDomainForHost } from "@/lib/config";

export async function createSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Supabase anon ključ nije podešen.");
  }

  const cookieStore = await cookies();
  const headerStore = await headers();
  const domain = authCookieDomainForHost(headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "");
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, domain ? { ...cookie.options, domain } : cookie.options);
          }
        } catch {
          // Server Components cannot always write cookies. The proxy refreshes the session.
        }
      },
    },
  });
}
