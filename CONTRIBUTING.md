# Contributing

Thanks for helping keep the Kali Linux Portfolio healthy. This guide highlights the
expectations for development, testing, and dependency management.

## Development Workflow

1. Install dependencies with `yarn install` (Node version is managed by `.nvmrc`).
2. Create feature branches locally and keep commits scoped.
3. Run the verification suite before pushing:
   - `yarn lint`
   - `yarn test`
   - `yarn build`
   - `yarn smoke` (when you touch app windows or routing)
4. For UI changes include screenshots or recordings in your PR description.
5. Never commit secrets. Use feature flags to guard experimental tooling.

## Dependency Management

All contributors should read and follow the
[`docs/dependency-policy.md`](./docs/dependency-policy.md). It explains when to
prefer caret (`^`) ranges, when to pin exact versions, and how to triage Renovate
pull requests. Align your `package.json` edits and review comments with that
policy so automated updates stay predictable.

## Reviewing Renovate PRs

Renovate is configured to:

- Automerge low-risk patch upgrades for dependencies that use caret ranges.
- Label framework and build-tool updates with `manual-review` and require human
  approval.
- Group TypeScript compiler updates with their accompanying `@types/*` packages.

Follow the triage checklist in the dependency policy when Renovate opens a PR,
and document any blockers directly in the PR discussion.
