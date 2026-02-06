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

## Dependency updates

Automated dependency maintenance is handled by [Renovate](https://docs.renovatebot.com/).

- Renovate runs once a week after 02:00 UTC on Mondays to batch dependency checks.
- All devDependencies are bundled into a single "Dev dependencies" pull request to simplify reviews.
- Patch and minor updates auto-merge once the required CI checks pass, so keep the main branch green.
- Renovate pull requests are labeled `dependencies` and `renovate`. Use those labels when referencing or triaging them.

If Renovate opens a pull request that needs manual intervention (for example, a major update), leave the labels in place and add context about what blocks the upgrade. Renovate will rebase automatically when changes land on the target branch.
