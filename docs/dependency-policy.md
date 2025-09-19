# Dependency Policy

## Renovate dependency gate

Automated dependency updates from Renovate must pass a dependency verification script before they can merge. Run the gate locally with:

```bash
yarn verify:deps
```

The script chains the following checks to ensure new packages do not break the workspace:

1. `yarn install --check-files` to confirm the lockfile and installed modules stay in sync. When the flag is unavailable (Yarn Berry), the script falls back to `yarn install --immutable --immutable-cache --check-cache` for equivalent safety.
2. `yarn tsc --noEmit` for a full TypeScript pass without emitting build output.
3. `yarn lint` to enforce repository lint rules.
4. `next build` to compile the Next.js application.
5. `yarn npm audit --severity high` to surface high severity advisories.

Continuous integration runs this script in the `renovate-verify-deps` job for Renovate pull requests and blocks merges on any failure. Keep this gate green when reviewing automated upgrades.
