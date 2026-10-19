#!/usr/bin/env bash
# Destructive fixtures belong only in an empty, disposable PostgreSQL database.
# Standard PGHOST/PGPORT/PGUSER/PGDATABASE variables select that database.
set -euo pipefail

if [[ "${FLOORPLAN_RLS_DISPOSABLE:-}" != "1" ]]; then
  echo 'Refusing to run: set FLOORPLAN_RLS_DISPOSABLE=1 only for an empty disposable database.' >&2
  exit 1
fi

test_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
migration="$test_dir/../../supabase/migrations/20261018154457_enable_floorplan_annotations_rls.sql"
psql_command=(psql -X --no-password -v ON_ERROR_STOP=1)

# This is an additional guard, not proof that an arbitrary connection is safe.
# Reject an existing public data schema or any of the fixture's global roles.
safe="$("${psql_command[@]}" --tuples-only --no-align --command="
  select current_setting('is_superuser') = 'on'
    and not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
    )
    and not exists (
      select 1 from pg_roles where rolname in
        ('floorplan_test_anon', 'floorplan_test_authenticated', 'floorplan_test_service')
    );")"
if [[ "$safe" != "t" ]]; then
  echo 'Refusing to run: require a superuser, empty public schema, and absent fixture roles.' >&2
  exit 1
fi

error_log="$(mktemp)"
trap 'rm -f -- "$error_log"' EXIT

# Execute the canonical bytes, rather than repeating the SQL in this test.
# An unknown error must fail the runner; only undefined_table for the intended
# relation is accepted. A missing file, auth error, or syntax error is not a pass.
if "${psql_command[@]}" --single-transaction -v VERBOSITY=verbose \
  --file="$migration" >"$error_log" 2>&1; then
  echo 'FAIL: migration unexpectedly succeeded without its target table.' >&2
  exit 1
fi
if ! grep -Eq 'ERROR: +42P01:' "$error_log" || \
   ! grep -Fq 'relation "public.floorplan_annotations" does not exist' "$error_log"; then
  cat "$error_log" >&2
  echo 'FAIL: migration failed for an unexpected reason.' >&2
  exit 1
fi
echo 'PASS: canonical migration fails closed when the target table is absent'

"${psql_command[@]}" --file="$test_dir/floorplan_annotations_rls.sql"

# The fixture rolls back schema, data and roles. Check that cleanup really held.
clean="$("${psql_command[@]}" --tuples-only --no-align --command="
  select to_regclass('public.floorplan_annotations') is null
    and not exists (
      select 1 from pg_roles where rolname in
        ('floorplan_test_anon', 'floorplan_test_authenticated', 'floorplan_test_service')
    );")"
if [[ "$clean" != "t" ]]; then
  echo 'FAIL: fixture objects remain after rollback.' >&2
  exit 1
fi
echo 'PASS: disposable fixture cleanup verified'
