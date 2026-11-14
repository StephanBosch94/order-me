"use client";

import { useEffect } from "react";

/** The host copies the demo sign-in query onto the next address. Drop it once the catalog is open. */
export function CleanDemoEntryUrl() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const role = url.searchParams.get("role");
    if (!url.searchParams.has("slug") || (role !== "kupac" && role !== "prodavac")) return;
    url.searchParams.delete("slug");
    url.searchParams.delete("role");
    const search = url.searchParams.toString();
    window.history.replaceState(null, "", `${url.pathname}${search ? `?${search}` : ""}${url.hash}`);
  }, []);
  return null;
}
