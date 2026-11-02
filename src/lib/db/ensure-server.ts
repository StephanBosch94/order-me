import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";

import EmbeddedPostgres from "embedded-postgres";

import { readPgAccount } from "@/lib/db/pg-account";

let starting: Promise<void> | null = null;
let watch: ReturnType<typeof setInterval> | null = null;

function accepting(port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    const done = (open: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.setTimeout(400, () => done(false));
  });
}

async function start() {
  const account = readPgAccount();
  if (!account) return;
  if (await accepting(account.port)) return;
  const server = new EmbeddedPostgres({
    databaseDir: path.join(process.cwd(), ".data", "pg"),
    user: account.user,
    password: account.password,
    port: account.port,
    persistent: true,
    autoRehydrateSymlinks: true,
  });
  if (!existsSync(path.join(process.cwd(), ".data", "pg", "PG_VERSION"))) {
    await server.initialise();
  }
  try {
    await server.start();
  } catch (error) {
    if (await accepting(account.port)) return;
    throw error;
  }
  try {
    await server.createDatabase(account.database);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists/i.test(message)) throw error;
  }
}

export function ensurePostgresServer() {
  if (starting) return starting;
  starting = start().finally(() => {
    starting = null;
  });
  return starting;
}

export function watchPostgresServer() {
  if (watch) return;
  watch = setInterval(() => {
    void ensurePostgresServer().catch((error) => {
      console.error(error);
    });
  }, 15000);
  watch.unref();
}
