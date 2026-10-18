# Supabase migrations

## Incremental RLS migration

[`migrations/20261018154457_enable_floorplan_annotations_rls.sql`](migrations/20261018154457_enable_floorplan_annotations_rls.sql)
enables row-level security on the existing `public.floorplan_annotations` table.
It is the only executable copy of this change in the repository. Preserve its
version when reconciling local and remote migration history; do not create a
second timestamped copy merely to repeat it.

The migration adds no policies and changes no grants or data. With no matching
policies, ordinary client roles cannot read, insert, update, or delete rows.
Review the application's actual ownership and access requirements before applying
it. Do not add blanket policies to restore unrestricted access. See
[security details and regression tests](../sql/README.md).

## Manual deployment

Application and database deployment are separate. Vercel, GitHub Pages, and the
existing GitHub Actions jobs do not deploy these migrations. A merge alone is
not evidence that a live database finding has been resolved.

For a reviewed database change:

1. Confirm the intended project and inspect its current schema, policies, and
   grants using read-only queries. Review and approve the specific access impact
   before changing live security settings.
2. Read remote migration history with `list_migrations` or the established CLI
   workflow. If this version is already present, verify the resulting state
   rather than submitting it again. Reconcile any history mismatch first.
3. Use the project's established migration process for an approved change.
   With connected Supabase tools, `apply_migration` accepts the verified project
   ID, a descriptive migration name, and reviewed SQL. Keep the repository and
   remote versions aligned. Do not invent or rewrite an assigned remote version.
4. Verify the resulting schema and relevant client-role behavior with read-only
   checks. Run mutation tests only in an isolated disposable database. Never run
   this repository's regression fixture against a live project.
5. Rerun Security Advisor and review the findings. Preserve unrelated settings
   and data unless a separate change has been approved.

## Baseline and automation prerequisites

This directory is incremental, not a complete schema baseline. The repository
does not define the creation of `public.floorplan_annotations`; applying this
migration to a blank database fails intentionally. There is no
`supabase/config.toml` or automatic production-deployment workflow here.

Before adopting a reproducible CLI workflow, reconcile local and remote migration
history and establish a reviewed schema baseline. Do not replay existing tables
or rewrite production migration history to make a fresh setup appear current.

The documented automated CLI workflow requires a project reference, access token,
and database password. Configuring persistent production access requires separate
authorization and secure credential entry in the chosen deployment environment.
Never place credentials in source control, documentation, logs, or chat. A
public/client key is not a migration credential. Use an appropriate protected
environment and review gate before enabling live deployments.

References: [Supabase migration management](https://supabase.com/docs/guides/local-development/database-migrations)
and [deployment environments](https://supabase.com/docs/guides/deployment/managing-environments).
