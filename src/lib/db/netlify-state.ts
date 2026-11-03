import type { DemoDatabase } from "@/lib/data/seed";

const STORE_NAME = "poruci-demo";
const DATABASE_KEY = "database";

/** Shared demo database for Netlify functions. Local Postgres and the JSON file stay as they are. */
export function netlifyDemoEnabled() {
  if (process.env.DATABASE_URL?.trim()) return false;
  if (process.env.NETLIFY !== "true") return false;
  if (process.env.NEXT_PHASE === "phase-production-build") return false;
  return true;
}

async function store() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export async function loadNetlifyDatabase(): Promise<DemoDatabase | null> {
  const loaded = await (await store()).get(DATABASE_KEY, { type: "json", consistency: "strong" });
  if (!loaded || typeof loaded !== "object") return null;
  return loaded as DemoDatabase;
}

export async function saveNetlifyDatabase(db: DemoDatabase) {
  await (await store()).setJSON(DATABASE_KEY, db);
}
