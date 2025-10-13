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

## Quality checks before committing

TypeScript now runs with `strict` options enabled. Keep the build healthy by running:

```bash
yarn typecheck
yarn lint
```

Avoid using `any` in new code—prefer accurate interfaces, discriminated unions, or type guards. Interactive controls must also have accessible labels (`<label>` or `aria-label`) so `yarn lint` remains clean.

See the [Architecture](./architecture.md) document for an overview of how the project is organized.

For app contributions, see the [New App Checklist](./new-app-checklist.md).
