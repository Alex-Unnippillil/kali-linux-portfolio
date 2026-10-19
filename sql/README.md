# Database security patches

Database SQL and the canonical files in `supabase/migrations/` are applied
separately from the application. GitHub Actions,
Vercel builds, and GitHub Pages deployments do **not** apply them to Supabase.
Merging a patch does not by itself resolve a live database advisory.

## `public.floorplan_annotations`: enable RLS

[The canonical migration](../supabase/migrations/20261018154457_enable_floorplan_annotations_rls.sql)
resolves the **RLS Disabled in Public** finding when applied to the existing table
in the Supabase project reporting it. See the [manual workflow and history safeguards](../supabase/README.md); do not
create a second migration merely to repeat an existing remote version.
The patch is safe to rerun and deliberately fails if the table is missing,
so a wrong project or schema is not silently treated as fixed.

The repository does not define this table's schema, ownership model, or client
access requirements. The patch therefore only enables RLS; it does not create
the table, invent ownership columns, add policies, or change existing grants.

**Access impact:** existing policies become effective when RLS is enabled.
Without a matching policy, `anon` and `authenticated` cannot read or modify
rows, even if they have table grants. Client features may stop working until
appropriate, narrowly scoped policies are reviewed and installed. Table owners
and roles with `BYPASSRLS` (such as Supabase's server-side `service_role`) normally
bypass RLS. Enabling RLS does not make an existing permissive policy safe.

### Apply and verify

1. Confirm the Supabase project and inspect the table's existing policies and
   grants in its SQL Editor before changing anything:

   ```sql
   select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
   from pg_policies
   where schemaname = 'public' and tablename = 'floorplan_annotations';

   select grantee, privilege_type
   from information_schema.table_privileges
   where table_schema = 'public' and table_name = 'floorplan_annotations'
   order by grantee, privilege_type;
   ```

2. Confirm the intended client access and review any existing policies. If
   client access is needed but no appropriate policy exists, determine the real
   ownership/access rules before adding one. Do not add `USING (true)` or
   `WITH CHECK (true)` merely to silence a warning or restore unrestricted access.
3. Follow the [manual deployment workflow](../supabase/README.md). Check migration
   history first. If this version is already present, verify its state. Otherwise,
   apply the canonical migration only to the approved target through its
   established migration process.
4. Verify that the following query returns `true` and that the policies and
   grants above are unchanged:

   ```sql
   select relrowsecurity
   from pg_class
   where oid = 'public.floorplan_annotations'::regclass;
   ```

5. Test representative `anon` and `authenticated` reads and writes, including
   attempts to access another user's rows. Do not use only the SQL Editor's
   owner role or a service key to test enforcement; those can bypass RLS.
6. Rerun Supabase Security Advisor. The disabled-RLS finding should disappear.
   A separate no-policy finding may remain if the table has no policies; resolve
   that only from the intended access model, not by granting blanket access.

## Regression test

Run the SQL test against an **empty, disposable PostgreSQL database**, as a
superuser able to create test roles. Never run the fixture on a live project.
It deliberately creates `public.floorplan_annotations` and fails if that table
already exists. Its synthetic columns and roles are test fixtures, not a
proposed production schema. All fixture changes are rolled back.

```sh
FLOORPLAN_RLS_DISPOSABLE=1 PGHOST=localhost PGUSER=postgres PGDATABASE=rls_test \
  bash sql/tests/run-floorplan-rls.sh
```

The runner requires explicit disposable opt-in and rejects an existing public
data schema or fixture roles. These guards are not permission to point it at a
live connection. It first executes the canonical migration without the target
table and accepts only the intended undefined-table error (`42P01`); unrelated
errors fail the run. It then runs the transactional fixture and verifies that
the table and roles are absent after rollback.

The SQL test covers default-deny reads and writes for ordinary API-like roles,
two simulated request subjects, service-role bypass, repeated application, and
preservation/enforcement of an existing restricted policy. Assertions verify
the effective SQL role, absence of superuser execution, and whether RLS is
actually active. The Database security workflow runs it in an isolated
PostgreSQL service. It never connects to Supabase or applies a live change.

Runner guard tests need only Node.js and Bash:

```sh
node --test sql/tests/verify-floorplan-rls-runner.mjs
```

These are migration-mechanics tests. Their `owner_id` schema, policy, and
identities are synthetic; setting a claim does not authenticate a Supabase user.
They do not prove a portfolio-specific access contract, actual PostgREST
behavior, a real-schema replay, or production recovery. There is no established
portfolio caller or schema for this table in the repository. Verify the
portfolio's deployment-to-database mapping and the table's relevance before
adding any real application policy or target-specific acceptance test. See the
[evidence-first task specification](../docs/supabase-security-deployment-prompt.md).

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
and [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).
