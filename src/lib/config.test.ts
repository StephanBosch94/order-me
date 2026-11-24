import assert from "node:assert/strict";
import test from "node:test";

import { getDataMode } from "@/lib/config";

const keys = [
  "NODE_ENV",
  "ALLOW_DEMO_MODE",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

function withEnvironment(values: Partial<Record<(typeof keys)[number], string>>, run: () => void) {
  const environment = process.env as Record<string, string | undefined>;
  const before = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    for (const key of keys) {
      const value = values[key];
      if (value === undefined) delete environment[key];
      else environment[key] = value;
    }
    run();
  } finally {
    for (const key of keys) {
      const value = before[key];
      if (value === undefined) delete environment[key];
      else environment[key] = value;
    }
  }
}

test("production refuses to start without Supabase", () => {
  withEnvironment({ NODE_ENV: "production" }, () => {
    assert.throws(() => getDataMode(), /Produkcija zahteva Supabase/);
  });
});

test("an explicit local production build may use demo mode", () => {
  withEnvironment({ NODE_ENV: "production", ALLOW_DEMO_MODE: "true" }, () => {
    assert.equal(getDataMode(), "demo");
  });
});

test("complete Supabase configuration always selects Supabase", () => {
  withEnvironment(
    {
      NODE_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
    },
    () => {
      assert.equal(getDataMode(), "supabase");
    },
  );
});
