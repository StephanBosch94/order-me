import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import EmbeddedPostgres from "embedded-postgres";

const root = process.cwd();
const dataDir = path.join(root, ".data");
const clusterDir = path.join(dataDir, "pg");
const accountPath = path.join(dataDir, "pg-account.json");
const envPath = path.join(root, ".env.local");

type Account = {
  user: string;
  password: string;
  port: number;
  database: string;
};

function account(): Account {
  if (existsSync(accountPath)) return JSON.parse(readFileSync(accountPath, "utf8")) as Account;
  const created: Account = {
    user: "prodora",
    password: randomBytes(18).toString("base64url"),
    port: 5432,
    database: "prodora",
  };
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(accountPath, `${JSON.stringify(created, null, 2)}\n`);
  return created;
}

function writeDatabaseUrl(value: string) {
  const key = "DATABASE_URL";
  const line = `${key}=${value}`;
  const current = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const lines = current.length > 0 ? current.split("\n") : [];
  let found = false;
  const next = lines.map((entry) => {
    if (!entry.startsWith(`${key}=`)) return entry;
    found = true;
    return line;
  });
  if (!found) {
    if (next.length > 0 && next[next.length - 1] !== "") next.push("");
    next.push(line);
  }
  writeFileSync(envPath, `${next.join("\n").replace(/\n*$/, "")}\n`);
}

async function main() {
  const created = account();
  const url = `postgres://${created.user}:${created.password}@127.0.0.1:${created.port}/${created.database}`;
  writeDatabaseUrl(url);
  const server = new EmbeddedPostgres({
    databaseDir: clusterDir,
    user: created.user,
    password: created.password,
    port: created.port,
    persistent: true,
    autoRehydrateSymlinks: true,
  });
  if (!existsSync(path.join(clusterDir, "PG_VERSION"))) {
    await server.initialise();
  }
  await server.start();
  try {
    await server.createDatabase(created.database);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists/i.test(message)) throw error;
  }
  console.log(`PostgreSQL sluša na 127.0.0.1:${created.port}, baza ${created.database}, nalog ${created.user}.`);
  await new Promise(() => undefined);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
