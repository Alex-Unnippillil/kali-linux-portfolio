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

## Vercel runtime configuration

- Node.js 20 is pinned in `.nvmrc`, `package.json#engines`, and `vercel.json`. No extra runtime overrides should be added in Vercel project settings.
- Vercel automatically applies this configuration to preview and production deployments, so both environments report the same runtime.
- To verify, run `vercel inspect <deployment-url> --target preview` and `vercel inspect <deployment-url> --target production`; both should list **Node.js 20** as the runtime.
