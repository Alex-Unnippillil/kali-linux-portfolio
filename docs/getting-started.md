# Getting Started

This project is built with [Next.js](https://nextjs.org/) and managed as a Yarn 4 workspace monorepo.

## Prerequisites

- Node.js 20
- Yarn 4 (workspaces are coordinated from the repo root)

## Installation

From the repository root run `yarn install` to hydrate all workspaces.

## Running in Development

```bash
# Run the Turbo pipeline (preferred)
yarn dev

# Or target the web workspace directly
yarn workspace @unnippillil/web dev
```

Shared tooling lives under `packages/config` (ESLint, Jest, TypeScript presets) and reusable React components are published
via `packages/ui`. Import UI primitives with:

```ts
import { CommandPalette } from '@unnippillil/ui';
```

See the [Architecture](./architecture.md) document for an overview of how the project is organized.

For app contributions, see the [New App Checklist](./new-app-checklist.md).
