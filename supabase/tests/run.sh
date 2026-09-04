#!/usr/bin/env bash
# Apply the migrations to a throwaway database and run the security suite
# against it.
#
# Needs a running PostgreSQL 16+ and psql. Point PGHOST/PGPORT/PGUSER at it, or
# set LOCK_TEST_PGHOST / LOCK_TEST_PGUSER. The database is dropped and recreated
# on every run, so a result never depends on what a previous run left behind.
#
#   npm run test:db
set -euo pipefail

DB="${LOCK_TEST_DB:-lock_test}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PSQL=(psql -v ON_ERROR_STOP=1 -q)
[[ -n "${LOCK_TEST_PGHOST:-}" ]] && PSQL+=(-h "$LOCK_TEST_PGHOST")
[[ -n "${LOCK_TEST_PGUSER:-}" ]] && PSQL+=(-U "$LOCK_TEST_PGUSER")

"${PSQL[@]}" -d postgres -c "drop database if exists ${DB};"
"${PSQL[@]}" -d postgres -c "create database ${DB};"

"${PSQL[@]}" -d "$DB" -f "$ROOT/supabase/tests/00_supabase_shim.sql"
for migration in "$ROOT"/supabase/migrations/*.sql; do
  echo "→ $(basename "$migration")"
  "${PSQL[@]}" -d "$DB" -f "$migration"
done

# Query output to /dev/null: the assertions report through NOTICE on stderr,
# and a column of empty "ok" rows would bury them.
#
# Each suite gets its own database from the same template, so the result cannot
# depend on the order the suites ran in.
for suite in "$ROOT"/supabase/tests/[0-9][1-9]_*.sql; do
  echo "→ $(basename "$suite")"
  "${PSQL[@]}" -d postgres -c "drop database if exists ${DB}_suite;"
  "${PSQL[@]}" -d postgres -c "create database ${DB}_suite template ${DB};"
  "${PSQL[@]}" -d "${DB}_suite" -o /dev/null -f "$suite"
done
"${PSQL[@]}" -d postgres -c "drop database if exists ${DB}_suite;"

echo "All database checks passed."
