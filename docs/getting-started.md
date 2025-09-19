# Getting Started

This project is built with [Next.js](https://nextjs.org/).

## Prerequisites

- Node.js 20
- yarn or npm

## Installation

```bash
yarn install
```

## Running in Development

```bash
yarn dev
```

## Conventional Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org) specification so release automation can
derive semantic versions.

- **Structure:** `type(optional-scope): short imperative summary`
- **Common types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- **Body/footers:** use when extra context is needed. Add `BREAKING CHANGE: description` to communicate major releases.

`commitlint` enforces this format locally and in CI:

- Installing dependencies (`yarn install`) sets up a Husky `commit-msg` hook that runs `yarn commitlint --edit "$1"`.
- The CI pipeline runs `yarn commitlint --from <base> --to <head>` for every pull request to catch invalid messages before
  merge.

If you need to commit without running the hook (e.g., for automated tooling) export `HUSKY=0` explicitly; otherwise every commit
should use the conventional format.

## Release Workflow

Releases are fully automated with [`semantic-release`](https://semantic-release.gitbook.io/semantic-release/):

1. Every push to `main` triggers `.github/workflows/release.yml`.
2. `semantic-release` analyzes commit history, bumps `package.json` according to semantic versioning, updates `CHANGELOG.md`, and
   creates a release commit and Git tag.
3. Release notes are published to GitHub Releases using the provided `GITHUB_TOKEN`.

Do **not** bump the version or changelog manually. To preview a release locally run `GITHUB_TOKEN=<token> yarn release --dry-run`;
use a personal access token with `repo` scope when running outside CI.

See the [Architecture](./architecture.md) document for an overview of how the project is organized.

For app contributions, see the [New App Checklist](./new-app-checklist.md).
