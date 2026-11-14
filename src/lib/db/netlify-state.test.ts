import assert from "node:assert/strict";
import test from "node:test";

import { netlifyDemoEnabled } from "./netlify-state";

const KEYS = ["DATABASE_URL", "NEXT_PHASE", "NETLIFY", "NETLIFY_BLOBS_CONTEXT", "NETLIFY_SITE_ID", "SITE_ID", "CONTEXT"] as const;

function withEnv(values: Partial<Record<(typeof KEYS)[number], string | undefined>>, run: () => void) {
  const previous = new Map(KEYS.map((key) => [key, process.env[key]]));
  for (const key of KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) process.env[key] = value;
  }
  try {
    run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("local demo stays in the JSON file", () => {
  withEnv({}, () => {
    assert.equal(netlifyDemoEnabled(), false);
  });
});

test("the Netlify server shares one database even when NETLIFY is unset", () => {
  withEnv({ SITE_ID: "site" }, () => {
    assert.equal(netlifyDemoEnabled(), true);
  });
  withEnv({ CONTEXT: "production" }, () => {
    assert.equal(netlifyDemoEnabled(), true);
  });
  withEnv({ NETLIFY: "true" }, () => {
    assert.equal(netlifyDemoEnabled(), true);
  });
});

test("a database URL and the production build do not use Netlify blobs", () => {
  withEnv({ SITE_ID: "site", DATABASE_URL: "postgres://local" }, () => {
    assert.equal(netlifyDemoEnabled(), false);
  });
  withEnv({ NETLIFY: "true", NEXT_PHASE: "phase-production-build" }, () => {
    assert.equal(netlifyDemoEnabled(), false);
  });
});
