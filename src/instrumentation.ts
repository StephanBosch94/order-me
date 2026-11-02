export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (!process.env.DATABASE_URL?.trim()) return;
  const { ensurePostgresServer, watchPostgresServer } = await import("@/lib/db/ensure-server");
  await ensurePostgresServer();
  watchPostgresServer();
}
