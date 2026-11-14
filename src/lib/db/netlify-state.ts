import type { DemoDatabase } from "@/lib/data/seed";

const STORE_NAME = "poruci-demo";
const DATABASE_KEY = "database";

/** Shared demo database for Netlify functions. Local Postgres and the JSON file stay as they are. */
export function netlifyDemoEnabled() {
  if (process.env.DATABASE_URL?.trim()) return false;
  if (process.env.NEXT_PHASE === "phase-production-build") return false;
  // The Next.js server handler does not always set NETLIFY=true. Without this,
  // each instance keeps orders in /tmp and the seller list never sees them.
  return (
    process.env.NETLIFY === "true" ||
    Boolean(process.env.NETLIFY_BLOBS_CONTEXT?.trim()) ||
    Boolean(process.env.NETLIFY_SITE_ID?.trim()) ||
    Boolean(process.env.SITE_ID?.trim()) ||
    process.env.CONTEXT === "production" ||
    process.env.CONTEXT === "deploy-preview" ||
    process.env.CONTEXT === "branch-deploy"
  );
}

async function store() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export type NetlifySnapshot = { db: DemoDatabase | null; etag: string | null };
export type NetlifyWrite = { modified: boolean; etag: string | null };

export async function loadNetlifySnapshot(): Promise<NetlifySnapshot> {
  const loaded = await (await store()).getWithMetadata(DATABASE_KEY, { type: "json", consistency: "strong" });
  if (!loaded || loaded.data == null || typeof loaded.data !== "object") {
    return { db: null, etag: loaded?.etag ?? null };
  }
  return { db: loaded.data as DemoDatabase, etag: loaded.etag ?? null };
}

export async function loadNetlifyDatabase(): Promise<DemoDatabase | null> {
  return (await loadNetlifySnapshot()).db;
}

/**
 * `etag === undefined` writes unconditionally.
 * `etag === null` creates the key only when it is missing.
 * A string writes only when that version is still current, so a slower save cannot erase a newer order.
 */
export async function saveNetlifyDatabase(db: DemoDatabase, etag?: string | null): Promise<NetlifyWrite> {
  const blob = await store();
  const result =
    etag === undefined
      ? await blob.setJSON(DATABASE_KEY, db)
      : etag
        ? await blob.setJSON(DATABASE_KEY, db, { onlyIfMatch: etag })
        : await blob.setJSON(DATABASE_KEY, db, { onlyIfNew: true });
  return { modified: result.modified, etag: result.etag ?? null };
}
