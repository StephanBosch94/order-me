export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { requireSessionSecret } = await import("@/lib/session-token");
  requireSessionSecret();
  const { getDataMode } = await import("@/lib/config");
  getDataMode();
  if (!process.env.DATABASE_URL?.trim()) return;
  const { ensurePostgresServer, watchPostgresServer } = await import("@/lib/db/ensure-server");
  await ensurePostgresServer();
  watchPostgresServer();
}
