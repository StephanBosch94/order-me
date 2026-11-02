import { Pool, type PoolClient } from "pg";

import { ensurePostgresServer } from "@/lib/db/ensure-server";
import { emptyDatabase, type DemoDatabase, type DemoUser } from "@/lib/data/seed";

const SCHEMA = `
create table if not exists app_meta (
  id integer primary key,
  version integer not null,
  seed_generation integer
);

create table if not exists users (
  id text primary key,
  email text not null unique,
  name text not null,
  password_hash text not null,
  kind text not null,
  document jsonb not null
);

create table if not exists sessions (
  id text primary key,
  document jsonb not null
);

create table if not exists organizations (
  id text primary key,
  document jsonb not null
);

create table if not exists members (
  id text primary key,
  document jsonb not null
);

create table if not exists categories (
  id text primary key,
  document jsonb not null
);

create table if not exists products (
  id text primary key,
  document jsonb not null
);

create table if not exists customers (
  id text primary key,
  document jsonb not null
);

create table if not exists orders (
  id text primary key,
  document jsonb not null
);

create table if not exists order_items (
  id text primary key,
  document jsonb not null
);

create table if not exists status_history (
  id text primary key,
  document jsonb not null
);

create table if not exists rate_limits (
  id text primary key,
  document jsonb not null
);

create table if not exists plans (
  id text primary key,
  document jsonb not null
);

create table if not exists subscriptions (
  id text primary key,
  document jsonb not null
);

create table if not exists invoices (
  id text primary key,
  document jsonb not null
);

create table if not exists supplier_notes (
  id text primary key,
  document jsonb not null
);
`;

const documents = [
  ["sessions", "sessions", "id"],
  ["organizations", "organizations", "id"],
  ["members", "members", "id"],
  ["categories", "categories", "id"],
  ["products", "products", "id"],
  ["customers", "customers", "id"],
  ["orders", "orders", "id"],
  ["order_items", "orderItems", "id"],
  ["status_history", "statusHistory", "id"],
  ["rate_limits", "rateLimits", "key"],
  ["plans", "plans", "id"],
  ["subscriptions", "subscriptions", "id"],
  ["invoices", "invoices", "id"],
  ["supplier_notes", "supplierNotes", "organizationId"],
] as const;

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function getPool() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL nije podešen.");
  if (!pool) {
    pool = new Pool({ connectionString, max: 4 });
    pool.on("error", () => undefined);
  }
  return pool;
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const client = await getPool().connect();
      try {
        await client.query("select pg_advisory_lock(641832)");
        await client.query(SCHEMA);
      } finally {
        await client.query("select pg_advisory_unlock(641832)").catch(() => undefined);
        client.release();
      }
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function databaseDown(error: unknown) {
  const code = (error as { code?: string }).code ?? "";
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "57P01" || code === "ECONNRESET") return true;
  const message = error instanceof Error ? error.message : "";
  return message.includes("ECONNREFUSED") || message.includes("Connection terminated");
}

function resetPool() {
  const current = pool;
  pool = null;
  schemaReady = null;
  void current?.end().catch(() => undefined);
}

async function withDatabase<T>(run: () => Promise<T>) {
  try {
    return await run();
  } catch (error) {
    if (!databaseDown(error)) throw error;
    resetPool();
    await ensurePostgresServer();
    return run();
  }
}

export async function loadDatabase(): Promise<DemoDatabase | null> {
  return withDatabase(async () => {
  await ensureSchema();
  const dbPool = getPool();
  const meta = await dbPool.query<{ version: number; seed_generation: number | null }>(
    "select version, seed_generation from app_meta where id = 1",
  );
  const row = meta.rows[0];
  if (!row) return null;
  const db = emptyDatabase();
  db.version = 1;
  db.seedGeneration = row.seed_generation ?? undefined;
  const users = await dbPool.query<{ document: DemoUser }>("select document from users");
  db.users = users.rows.map((item) => item.document);
  for (const [table, key] of documents) {
    const result = await dbPool.query<{ document: unknown }>(`select document from ${table}`);
    (db as Record<string, unknown>)[key] = result.rows.map((item) => item.document);
  }
  return db;
  });
}

export async function saveDatabase(db: DemoDatabase) {
  return withDatabase(async () => {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into app_meta (id, version, seed_generation)
       values (1, $1, $2)
       on conflict (id) do update set version = excluded.version, seed_generation = excluded.seed_generation`,
      [db.version, db.seedGeneration ?? null],
    );
    await replaceUsers(client, db.users);
    for (const [table, key, idField] of documents) {
      await client.query(`delete from ${table}`);
      for (const item of db[key] ?? []) {
        const record = item as { id?: string; key?: string; organizationId?: string };
        const id = idField === "key" ? record.key : idField === "organizationId" ? record.organizationId : record.id;
        await client.query(`insert into ${table} (id, document) values ($1, $2)`, [id, item]);
      }
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  });
}

async function replaceUsers(client: PoolClient, users: DemoUser[]) {
  await client.query("delete from users");
  for (const user of users) {
    await client.query(
      `insert into users (id, email, name, password_hash, kind, document)
       values ($1, $2, $3, $4, $5, $6)`,
      [user.id, user.email, user.name, user.passwordHash, user.kind, user],
    );
  }
}
