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

## Type Checking

- `yarn typecheck` – runs the client composite TypeScript project (which references the server build) for fast feedback.
- `yarn typecheck:all` – runs `tsc -b` at the repo root so server utilities build before the client bundle declarations.

If your editor supports multi-root TypeScript workspaces, open `tsconfig.client.json` by default and add `tsconfig.server.json` when working on API routes or middleware to keep diagnostics in sync with the build.

See the [Architecture](./architecture.md) document for an overview of how the project is organized.

For app contributions, see the [New App Checklist](./new-app-checklist.md).
