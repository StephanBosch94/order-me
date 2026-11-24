import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { sharedAuthCookieOptions } from "@/lib/auth-cookie";

export async function createSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Supabase anon ključ nije podešen.");
  }

  const cookieStore = await cookies();
  return createServerClient(url, anon, {
    cookieOptions: sharedAuthCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        } catch {
          // Server Components cannot always write cookies. The proxy refreshes the session.
        }
      },
    },
  });
}
