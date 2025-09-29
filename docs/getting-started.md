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

## Debug-only features

- The Resource Monitor app is only available automatically in development (`yarn dev`).
- To test it in staging or production-like builds, set `NEXT_PUBLIC_ENABLE_RESOURCE_MONITOR=true` in your environment before running `yarn build` or `yarn start`.
- Leaving the flag unset keeps the monitor hidden so public builds stay lightweight.
