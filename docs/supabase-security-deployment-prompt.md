# Supabase security and deployment: an evidence-first task prompt

This is a reusable task specification, not a report of completed security or
deployment work. Adding it to the repository does not execute the prompt, change
a database, connect an integration, or authorize persistent access. Project
identifiers, private schema details, credentials, and live evidence belong in an
approved private channel, not this public repository.

## 1. What a top professional would add

A senior database-security and release engineer would establish the intended
access contract before changing enforcement. They would trace each real caller
to its database role and allowed operations, then prove both that unauthorized
access fails and that necessary behavior still works. Clearing an advisor warning
or observing `relrowsecurity = true` proves only part of that claim.

They would also bind the reviewed migration, tested commit, deployment run,
remote migration history, and resulting catalog state into one evidence chain.
They would identify failure and recovery conditions before deployment. This adds
depth to the existing RLS and GitHub-deployment task without expanding it into an
application-wide security audit or infrastructure redesign.

## 2. The rawest material to start from

- Exact Git commit and migration bytes, actual client/server call sites, tests,
  deployment configuration, and original CI/deployment logs.
- Read-only PostgreSQL catalog results for the affected table: columns and
  constraints, owner, RLS flags, policies, effective privileges, and relevant role
  membership or `BYPASSRLS` attributes. Inspect dependent views/functions only
  when they participate in this access path.
- The target's actual migration-history rows and current integration settings,
  rather than a README, previous summary, or green application deployment.
- Sanitized request/response evidence from the real API boundary, using synthetic
  identities and records in an isolated environment. Record the actual role and
  claims relevant to authorization without exposing tokens or personal data.

The existing public starting points are the
[canonical enable-only migration](../supabase/migrations/20261018154457_enable_floorplan_annotations_rls.sql),
[migration guidance](../supabase/README.md),
[SQL regression and limitations](../sql/README.md), and
[database-security workflow](../.github/workflows/database-security.yml).
The synthetic regression fixture is not the production schema or proof of the
application's ownership model.

## 3. Specific methods and tools

- Use `git show`, scoped code search, and GitHub checks/logs to establish exact
  source provenance and trace the affected call path.
- Query PostgreSQL with read-only Supabase tools or `psql`; inspect `pg_class`,
  `pg_policies`, `pg_roles`, grants, and effective privileges. Derive a
  role-by-operation access matrix and review `USING`/`WITH CHECK` against it.
- Use transactional SQL assertions or pgTAP for database tests. Add a small
  PostgREST/client-level test using the actual application entry point, with
  separate authorized and unauthorized identities. Check row counts and stored
  values, not merely HTTP status or absence of errors.
- Use a version-pinned Supabase CLI where appropriate. Confirm commands with
  `--help`; inspect migration history, review a deployment dry run, and perform
  schema/replay checks only in a disposable environment with known prerequisites.
- Inspect the chosen GitHub integration or Actions release path, permissions,
  target mapping, checks, and execution logs. Re-query the database afterward.
  Supabase Security Advisor is a supplementary check, not an authorization test.

## 4. What independently shows the result is right

Reproducible assertions run by PostgreSQL and the actual API, revision-bound CI
results, remote migration records, and before/after catalog observations must
agree. Another maintainer should be able to repeat the isolated tests and reach
the same conclusion from their outputs. A reviewer's confidence, a generated
summary, an advisor's silence, or a successful web build alone is insufficient.

## Rewritten prompt

Complete the existing Supabase row-level-security and GitHub database-deployment
task for this repository. Go deeper on its correctness and evidence, without
adding unrelated security work, features, dependency changes, preview projects,
or infrastructure redesign. Preserve the simulation-only product boundary and
follow the repository's maintainer instructions.

### A. Establish the narrow contract from primary evidence

1. Identify the exact repository commit, canonical migration version and SQL,
   affected table, intended target, and existing deployment route. Verify the
   target privately; use placeholders in public artifacts. Treat previous
   summaries as leads to verify, not current-state evidence.
2. Read the target's relevant catalog state and migration history without
   changing it. Capture the table definition, ownership/relationship constraints,
   RLS flags, policies, effective grants, and relevant role attributes. Inspect
   views, functions, and RPCs only if the actual caller path uses them.
3. Trace the actual browser/server callers and their authentication boundaries.
   Produce a small role-by-operation matrix for `SELECT`, `INSERT`, `UPDATE`, and
   `DELETE`, including which rows each caller may access and why. Link each rule
   to a source or an explicit product decision. Do not invent ownership columns,
   tenant membership, or policies. If callers or intended rules cannot be
   established, identify that precise gap and pause the dependent change.
4. Decide whether the existing enable-only migration already meets that
   contract. No-policy default-deny is correct only if ordinary client access is
   intentionally absent. A passing service-role query does not demonstrate RLS
   enforcement. Make only the smallest justified correction, if one is needed.

### B. Prove security and intended behavior

5. Turn the matrix into repeatable tests against the real affected schema in an
   isolated, disposable database. Use synthetic fixtures and verify effective
   role and claims. Cover signed-out access, an authorized caller, another user
   or non-member, and prohibited operations. Where the contract has no permitted
   client access, assert that denial explicitly and test any legitimate server
   path separately without treating its bypass as client authorization.
6. Assert actual returned rows, affected-row counts, and final values. Include
   cross-user reads, prohibited writes, and ownership/relationship reassignment
   attempts when those concepts exist. Test both existing-row predicates and
   proposed-row checks. Distinguish privilege errors from RLS filtering and
   silent zero-row updates. A successful request returning nothing is not a
   positive-access test.
7. Exercise the corresponding PostgREST or application-client boundary with the
   same identities in an isolated environment. Do not test enforcement solely as
   a table owner, superuser, or `BYPASSRLS` role. Privileged fixture setup is
   separate from non-privileged assertions; never weaken production controls to
   make a test pass. Run relevant existing regression checks and state exactly
   which claims the synthetic repository fixture cannot establish.

### C. Verify migration safety and the deployment path

8. Compare repository migration versions and contents with remote history and
   actual affected-object state. Existing applied versions are to be verified,
   not duplicated under new timestamps. Do not rewrite applied migrations or
   repair history merely to make a tool report success.
9. Separate two questions: can the verified existing target accept the next
   incremental migration, and can the repository recreate a blank database?
   Missing full-baseline coverage blocks the latter; it does not automatically
   block the former when history, prerequisites, and the deployment plan match.
   Do not add a full baseline or new preview environment unless this narrow task
   demonstrably requires it and the added scope is approved.
10. Rehearse the approved transition in a disposable environment with its real
    prerequisites. Verify preservation of unrelated grants, policies, and data;
    repeat application where idempotence is claimed; and a second deployment
    plan with no unintended pending changes. Report drift checks and tool
    coverage limits. A successful synthetic fixture is not a full replay test.
    Never run reset, destructive fixtures, or mutation probes on production.
11. Before deployment, state the exact change, target, access impact, abort
    criteria, and recovery plan. Prefer a reviewed forward correction when
    reversal would reopen access or lose data. Rehearse recovery where feasible;
    distinguish a tested recovery from a proposed one. Do not disable RLS or
    grant blanket access as a shortcut.
12. Verify the existing GitHub-to-Supabase route and use one controlled deployment
    path. Check repository/branch/target mapping, least-privilege access, review
    gates, and protection against concurrent deployment. Inspect the precise
    migration plan before applying anything. Obtain separate explicit approval
    before creating or expanding persistent access or enabling the integration;
    use secure credential entry, never chat or committed secrets. Do not bypass
    a sign-in or approval blocker with another identity or broader permissions.

### D. Establish completion from external evidence

13. After an authorized deployment, verify the exact deployed revision and
    migration IDs in the provider's run records, remote migration history, and
    fresh catalog reads. Run permitted non-destructive production checks and
    rerun the relevant advisor. Mutation verification belongs in the isolated
    test environment. If automation is configured but has not completed a
    relevant run, say that it is configured but unproven; do not invent a dummy
    production migration just to obtain a green deployment.
14. Deliver a focused diff or a justified no-change conclusion, the access
    matrix, repeatable tests, and a compact evidence record containing exact
    commit SHAs, migration IDs, tool versions, commands, expected/observed
    results, CI/deployment links, and remaining limitations. Keep private target
    details and live schema evidence out of this public repository. Separate
    passed, failed, blocked, skipped, and not-run checks.
15. Report these outcomes separately: repository change merged, database change
    applied, intended access verified, and automatic deployment enabled and
    exercised. Do not infer one from another. Stop when this narrow outcome is
    proved or when a specific missing decision, access grant, or prerequisite
    prevents further authorized progress; report the smallest next step.

## Primary references

Verify behavior against the versions actually used. These sources explain the
mechanisms; project-specific correctness comes from the evidence above.

- [PostgreSQL row security policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase CLI database push and dry run](https://supabase.com/docs/reference/cli/supabase-db-push)
- [Supabase deployment environments](https://supabase.com/docs/guides/deployment/managing-environments)
- [Supabase GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration)
