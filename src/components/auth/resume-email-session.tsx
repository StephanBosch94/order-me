"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";

import { openConfirmedStore } from "@/lib/actions/open-confirmed-store";
import { sharedAuthCookieOptions } from "@/lib/auth-cookie";

/** The mail link can land on the site with the session in the address hash. Open the new shop from there. */
export function ResumeEmailSession() {
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const type = hash.get("type");
    if (!accessToken || !refreshToken) return;
    if (type && type !== "signup" && type !== "email" && type !== "magiclink") return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return;

    queueMicrotask(() => setOpening(true));
    const supabase = createBrowserClient(url, anon, { cookieOptions: sharedAuthCookieOptions() });
    void supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(async (result) => {
      if (result.error) {
        setOpening(false);
        return;
      }
      const destination = await openConfirmedStore();
      window.location.replace(destination);
    });
  }, []);

  if (!opening) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background px-6 text-center">
      <p className="text-lg font-medium">Otvaramo prodavnicu.</p>
    </div>
  );
}
