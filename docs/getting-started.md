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

## CI Builds

The build script detects the `CI` environment variable and sets `NODE_OPTIONS="--max-old-space-size=4096"` to accommodate memory-constrained environments. In local development this variable is untouched unless you set it explicitly.
