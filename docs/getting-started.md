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

See the [Architecture](./architecture.md) document for an overview of how the project is organized.

For app contributions, see the [New App Checklist](./new-app-checklist.md).

## CI Stability Policy

- Every pull request must produce three consecutive green runs of `yarn test --coverage` in CI. The GitHub Actions summary for the Jest job records each attempt and blocks merge if stability is not achieved.
- When code lands on `main`, CI executes `yarn test` and `npx playwright test --retries=0` without retries. Any failure is preserved in the workflow summary so contributors can investigate flakiness immediately.
- Before opening a PR, mimic the policy locally by looping `yarn test --coverage` (e.g., `for i in {1..3}; do yarn test --coverage || break; done`) and running Playwright against a dev server with `npx playwright test --retries=0`.
