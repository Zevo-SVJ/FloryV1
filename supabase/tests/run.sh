#!/usr/bin/env bash
# Apply the migrations to a throwaway database and run the RLS suite against it.
#
# Needs a running PostgreSQL 16+ and psql. Point PGHOST/PGPORT/PGUSER at it, or
# set SHOWME_TEST_PGHOST to a socket directory. The database is dropped and
# recreated on every run, so the result never depends on what a previous run
# left behind.
#
#   ./supabase/tests/run.sh
set -euo pipefail

DB="${SHOWME_TEST_DB:-showme_test}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PSQL=(psql -v ON_ERROR_STOP=1 -q)
[[ -n "${SHOWME_TEST_PGHOST:-}" ]] && PSQL+=(-h "$SHOWME_TEST_PGHOST")
[[ -n "${SHOWME_TEST_PGUSER:-}" ]] && PSQL+=(-U "$SHOWME_TEST_PGUSER")

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
# Each suite gets its own database, because they insert overlapping fixtures
# and a shared one would make the result depend on the order they ran in.
for suite in "$ROOT"/supabase/tests/[0-9][1-9]_*.sql; do
  echo "→ $(basename "$suite")"
  "${PSQL[@]}" -d postgres -c "drop database if exists ${DB}_suite;"
  "${PSQL[@]}" -d postgres -c "create database ${DB}_suite template ${DB};"
  "${PSQL[@]}" -d "${DB}_suite" -o /dev/null -f "$suite"
done
"${PSQL[@]}" -d postgres -c "drop database if exists ${DB}_suite;"
