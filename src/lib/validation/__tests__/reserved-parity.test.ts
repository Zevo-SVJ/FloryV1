import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { reservedUsernameList } from "../reserved.ts";

/**
 * The two reserved lists must say the same thing.
 *
 * One lives in TypeScript so the signup form can answer instantly; the other
 * lives in `reserved_usernames` and is what actually refuses a write. They are
 * edited by hand in different files, which is exactly the kind of pair that
 * drifts — a name added to one and forgotten in the other is either a reserved
 * word somebody can claim, or a name the form rejects and the database allows.
 *
 * This reads the migrations rather than the database, so it runs in `npm test`
 * with no Postgres.
 */

const MIGRATIONS = path.join(import.meta.dirname, "../../../../supabase/migrations");

/** Every username the migrations insert, minus the ones they later delete. */
function reservedInMigrations(): Set<string> {
  const reserved = new Set<string>();

  for (const file of readdirSync(MIGRATIONS).sort()) {
    if (!file.endsWith(".sql")) continue;
    const sql = readFileSync(path.join(MIGRATIONS, file), "utf8");

    for (const statement of sql.split(";")) {
      if (/insert\s+into\s+public\.reserved_usernames/i.test(statement)) {
        for (const match of statement.matchAll(/\(\s*'([^']+)'\s*,\s*'[^']*'\s*\)/g)) {
          if (match[1]) reserved.add(match[1]);
        }
      }

      if (/delete\s+from\s+public\.reserved_usernames/i.test(statement)) {
        for (const match of statement.matchAll(/'([^']+)'/g)) {
          if (match[1]) reserved.delete(match[1]);
        }
      }
    }
  }

  return reserved;
}

test("the TypeScript and SQL reserved lists agree", () => {
  const inCode = new Set(reservedUsernameList());
  const inDatabase = reservedInMigrations();

  assert.ok(inDatabase.size > 0, "no reserved usernames were found in the migrations");

  const missingFromDatabase = [...inCode].filter((name) => !inDatabase.has(name)).sort();
  const missingFromCode = [...inDatabase].filter((name) => !inCode.has(name)).sort();

  assert.deepEqual(
    missingFromDatabase,
    [],
    "reserved in code but claimable in the database — write a migration inserting these",
  );
  assert.deepEqual(
    missingFromCode,
    [],
    "reserved in the database but not in code — the form would offer these as available",
  );
});
