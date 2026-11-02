import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type PgAccount = {
  user: string;
  password: string;
  port: number;
  database: string;
};

export function readPgAccount(): PgAccount | null {
  const file = path.join(process.cwd(), ".data", "pg-account.json");
  if (!existsSync(file)) return null;
  const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<PgAccount>;
  if (!parsed.user || !parsed.password || !parsed.database) return null;
  return {
    user: parsed.user,
    password: parsed.password,
    port: parsed.port ?? 5432,
    database: parsed.database,
  };
}
