# Supabase deployment record

## Applied migration

- Project: `supabase-emerald-car` (`udhdkwcmoufnlcfnmpdi`).
- Applied at: 2026-10-18 15:44:57 UTC, after confirming the target and access impact.
- Recorded remote version: `20261018154457`.
- Recorded name: `enable_floorplan_annotations_rls`.
- Canonical SQL: [`migrations/20261018154457_enable_floorplan_annotations_rls.sql`](migrations/20261018154457_enable_floorplan_annotations_rls.sql).

The canonical file mirrors the statement already applied by the connected
Supabase migration tool. It is the only executable copy of this change in the
repository. Do not create a new timestamped copy or reapply it as a new migration.

Verification on 2026-10-18 confirmed:

- `public.floorplan_annotations` has RLS enabled; forced owner enforcement is off.
- Its policy count remains zero. Existing table grants and data were not changed.
- Read-only queries as `anon` and `authenticated` reported active row security
  and zero visible rows. These roles do not have `BYPASSRLS`.
- `service_role` retains its existing `BYPASSRLS` behavior.
- Security Advisor no longer reports **RLS Disabled in Public** for this table.
  The informational **RLS Enabled No Policy** finding is expected. Schema
  discoverability warnings remain because existing grants were preserved.

With no matching policies, ordinary client roles cannot read, insert, update,
or delete rows. Add policies only after reviewing the application's actual
ownership and access requirements. Do not add blanket policies to restore
unrestricted access. See [security details and regression tests](../sql/README.md).

## Manual deployment through the connected Supabase tools

The application deployment and database deployment are separate. Vercel,
GitHub Pages, and the existing GitHub Actions jobs do not deploy these migrations.
No new credentials are required to use an already-authorized Supabase connection.

For a reviewed database change:

1. Confirm the intended project and inspect its current schema, policies, and
   grants using read-only queries. Review and approve the specific access impact
   before changing live security settings.
2. Read remote migration history with `list_migrations`. For the project above,
   `20261018154457_enable_floorplan_annotations_rls` is already applied; verify
   its state rather than submitting it again.
3. For a new approved change, use `apply_migration` with the verified project ID,
   a descriptive migration name, and the reviewed SQL. Record the returned remote
   version and keep the repository migration history aligned with it. Use the
   Supabase CLI to generate genuinely new local migration files; do not invent
   or change a version already assigned by the remote migration history.
4. Verify the resulting schema and relevant client-role behavior with read-only
   checks. Run mutation tests only in an isolated disposable database. Never run
   the regression fixture in this repository against the live project.
5. Rerun Security Advisor with `get_advisors` and review the findings. Preserve
   unrelated settings and data unless a separate change has been approved.

## Limits and future automated deployment

This directory is an incremental record for an existing database, not a complete
schema baseline. The repository does not define the existing property-management
schema or the creation of `public.floorplan_annotations`. Applying this migration
to a blank database will fail intentionally. There is no `supabase/config.toml`
or automated production-deployment workflow in this repository.

Before adopting a reproducible Supabase CLI workflow, reconcile local and remote
migration history and establish a reviewed baseline of the existing schema.
The recorded version above must remain aligned; do not replay existing tables or
rewrite production migration history to make a fresh setup appear current.

Automatic GitHub-to-Supabase deployment is **not enabled**. The documented CLI
workflow requires a project reference, access token, and database password.
Configuring persistent production access requires separate authorization and
secure entry of credentials into the chosen deployment environment. Never place
credentials in source control, documentation, logs, or chat. A public/client key
is not a database migration credential. Consider a protected production
environment and review gate before enabling live deployments.

References: [Supabase migration management](https://supabase.com/docs/guides/local-development/database-migrations)
and [deployment environments](https://supabase.com/docs/guides/deployment/managing-environments).
