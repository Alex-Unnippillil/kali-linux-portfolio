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

## Fresh Clone Verification

Before major upgrades or releases, create a clean working tree (new clone or `git clean -xfd && rm -rf node_modules`) and run:

```bash
yarn verify:fresh
```

The command installs dependencies with `--immutable`, runs `yarn build`, and briefly starts the production server. It fails fast when the build or preview logs ESLint, TypeScript, or Next.js warnings so contributors can fix issues before they reach CI, while still surfacing Yarn install output for dependency drift.

See the [Architecture](./architecture.md) document for an overview of how the project is organized.

For app contributions, see the [New App Checklist](./new-app-checklist.md).
