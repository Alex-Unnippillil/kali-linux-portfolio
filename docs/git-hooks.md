# Git hooks & local quality gates

The repository uses [Husky](https://typicode.github.io/husky/) to ensure a consistent
pre-commit experience. Hooks only target changed files so contributors get fast feedback
without waiting for full project checks.

## What runs on pre-commit?

`yarn hook:check` (wired to the `pre-commit` hook) runs four focused stages:

1. **Linting** – `yarn lint:staged` invokes ESLint only on changed JavaScript/TypeScript files.
2. **Unit tests** – `yarn test:staged` feeds the changed files into `jest --findRelatedTests` with caching under `.cache/jest`.
3. **Type checks** – `yarn typecheck:staged` executes `tsc --incremental` with a cached build info file in `.cache/typescript`.
4. **Accessibility smoke** – `yarn a11y:staged` starts a temporary `next dev` server (port 4123 by default) and
   runs Pa11y only against routes derived from the staged pages/components (defaults to `/` for shared UI changes).

Each stage skips automatically when no relevant files changed, keeping the whole hook comfortably under 20 seconds on
typical updates.

## Installing or refreshing Husky

The repo’s `prepare` script runs `husky install`, so any of the following actions will (re)install the hooks:

```bash
# fresh clone
yarn install

# or trigger manually if hooks need to be regenerated
yarn hook:install
```

If you edit `.husky/pre-commit`, re-run `yarn hook:install` to ensure the hook is executable.

## Running the checks on demand

Use `yarn hook:check` to execute the same sequence without committing. For CI parity there is also
`yarn hook:verify`, which compares the current branch against `origin/<base>` (or the `GITHUB_BASE_REF` on GitHub Actions).

## Emergency bypass protocol

Hooks protect the default branch. Bypassing them should be rare and requires maintainer approval. If you receive approval,
disable Husky for a single commit with:

```bash
HUSKY=0 git commit -m "..."
```

Follow up with a full CI run (`yarn hook:verify` or the standard workflows) and link the approval in your pull request
description.
