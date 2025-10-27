# Dependency alert remediation playbook

This playbook explains how we respond to ecosystem alerts surfaced by Dependabot, `npm audit`, and the license scanner. Treat it as the first stop when a security or compliance warning lands in GitHub.

## 1. Weekly automation cadence

- **Dependabot.** The `.github/dependabot.yml` file schedules weekly update PRs for npm packages (Sundays at 03:00 UTC) and GitHub Action workflows (Mondays at 04:00 UTC).
- **npm audit.** CI runs `yarn npm audit --recursive --json` on every pull request and stores the machine-readable output plus a markdown summary in the `npm-audit-report` artifact.
- **License scan.** The `scripts/license-scan.mjs` script enforces the allowlist in `scripts/license-allowlist.json` and will fail CI when a dependency publishes an unapproved or missing license.

## 2. Responding to Dependabot alerts

1. **Review the PR description.** Dependabot explains the advisory and suggested version. Confirm that the change applies cleanly to our Next.js + Yarn 4 workspace.
2. **Run local verification.** Check out the branch and run the standard quality gates:
   - `yarn install --immutable --immutable-cache`
   - `yarn lint`
   - `yarn test`
   - `yarn npm audit --recursive`
3. **Assess breaking changes.** Read upstream release notes for app-breaking or UI-breaking changes. Flag risky updates in the PR thread and plan incremental rollouts when needed.
4. **Merge or defer.** Merge when tests pass and the change is safe. If the update is blocked, leave a note explaining the hold-up and add the package to the Dependabot ignore list with an expiry if possible.

## 3. Handling npm audit findings

1. **Download the artifact.** From the CI run, grab `npm-audit-summary.md` and `npm-audit.ndjson`.
2. **Triage severity.** The summary lists total findings plus a severity breakdown. CI fails automatically for `high` and `critical` issues, but moderate alerts still deserve tracking.
3. **Identify the owning dependency.** Use `yarn why <package>` or inspect the NDJSON entry to see which first-party code pulls the vulnerable package.
4. **Choose a mitigation:**
   - Bump or replace the dependency.
   - Apply upstream patches or resolutions via `package.json#resolutions` (temporarily) and file an issue with the maintainer.
   - If no fix exists, isolate the dependency and document the compensating controls.
5. **Document the fix.** Reference the advisory ID in the PR title or body and note any follow-up tasks.

## 4. Addressing license violations

1. **Inspect `scripts/license-allowlist.json`.** The `allowed`, `aliases`, and `exceptions` keys define our policy. Exceptions should remain rare and well documented.
2. **Run `node scripts/license-scan.mjs`.** The script reports every package missing license metadata or using an unapproved license. CI displays the same output.
3. **Remediate:**
   - Prefer dependencies that publish SPDX-compliant licenses from the allowlist.
   - Reach out to maintainers of missing-license packages and request an update.
   - For required GPL or Hippocratic packages, keep the exception list tidy and verify downstream redistribution obligations.
4. **Update the policy.** When you add an exception or adjust the allowlist, capture the reasoning in the PR description so reviewers can audit the decision later.

## 5. Tracking and follow-up

- Record high-severity advisories and unresolved license gaps in the security backlog.
- Reference this playbook in review comments to keep remediation consistent across contributors.
- Re-run `node scripts/license-scan.mjs` and `yarn npm audit --recursive --json` before cutting a release or deployment tag.

Keeping these steps tight ensures the simulated Kali Linux environment stays safe, educational, and compliant.
