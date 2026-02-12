# Git History Secret Scan Log

- **Scan date:** 2025-09-19 (UTC)
- **Tool & version:** Gitleaks 8.28.0
- **Command:** `gitleaks detect --source . --report-format json`
- **Scope:** Entire repository history (128 commits)
- **Outcome:** 15 findings surfaced by the `generic-api-key` rule. Manual review confirmed they are all simulated values that ship with the training apps, so no live credentials were exposed.

## Finding review

| Location | Matched value (abridged) | Why it is safe | Follow-up action |
| --- | --- | --- | --- |
| `apps/hydra/components/WordlistAtelier.tsx` | `8d969eef6ecad3c29a...` | SHA-256 hash for the demo string `"123456"`; used to teach how dictionary attacks work. | Keep in place for the simulation. Prefix demo hashes with comments explaining they are fake to reduce triage time. |
| `apps/john/index.tsx` | `e10adc3949ba59abbe...` | MD5 hash of `"123456"` bundled in the password-auditing simulator. | Keep as-is. Add developer note clarifying hashes are canned samples if future scans cause noise. |
| `components/apps/mimikatz/index.js` | `Token: 0123456789ABCD...` and `Token: FEDCBA987654...` | Placeholder tokens rendered in the UI so that masking/unmasking logic has data. | No rotation required. Consider swapping to an obviously fake prefix such as `DEMO_TOKEN_...` or suppress via a local gitleaks allowlist. |
| `src/components/settings/WMKeyboard.tsx` | `STORAGE_KEY = 'xfce4_shortcuts'` | LocalStorage key name for keyboard shortcut preferences. | Leave unchanged. Add to an allowlist if recurring alerts hinder future scans. |

## Remediation & prevention steps

1. Confirmed each alert traces to demo content shipped with the training interfaces—no production secrets were committed.
2. Documented the findings here so future reviewers know these are intentional fixtures.
3. Recommend annotating the affected files with short comments (or extending the repository gitleaks config) so subsequent runs surface only actionable leaks.
4. Keep real credentials out of source control by loading them exclusively from local `.env` files and the deployment platform secret stores.

## Rotation procedure for real leaks

If a future scan uncovers an actual credential:

1. **Revoke or rotate immediately.** Disable the leaked key in its upstream service and generate a new one.
2. **Purge the secret from git history.** Use `git filter-repo` or the BFG Repo-Cleaner to rewrite affected commits, then force-push the sanitized history.
3. **Update configuration.** Point the application to the rotated secret via environment variables; never hardcode it back into the repo.
4. **Notify impacted teams.** Let operations and application owners know what changed so they can validate services.
5. **Re-run gitleaks.** Confirm the repository is clean after remediation and record the results in this log.

## Future scans

- Re-run the history scan before every release branch cut and during the monthly maintenance window.
- Add `gitleaks detect --source .` to the CI pipeline so pull requests cannot introduce new high-entropy strings without review.
