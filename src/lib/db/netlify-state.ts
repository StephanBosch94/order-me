import type { DemoDatabase } from "@/lib/data/seed";

/** Netlify Blobs are not used. Production data lives in Supabase. */
export function netlifyDemoEnabled() {
  return false;
}

export type NetlifySnapshot = { db: DemoDatabase | null; etag: string | null };
export type NetlifyWrite = { modified: boolean; etag: string | null };

export async function loadNetlifySnapshot(): Promise<NetlifySnapshot> {
  throw new Error("Netlify blobs se ne koriste. Povežite Supabase.");
}

export async function loadNetlifyDatabase(): Promise<DemoDatabase | null> {
  throw new Error("Netlify blobs se ne koriste. Povežite Supabase.");
}

export async function saveNetlifyDatabase(
  _db: DemoDatabase,
  _etag?: string | null,
): Promise<NetlifyWrite> {
  throw new Error("Netlify blobs se ne koriste. Povežite Supabase.");
}
