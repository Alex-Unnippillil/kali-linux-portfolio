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

## Release process

Before tagging a release, mirror the `state-gate` CI job locally:

1. Run `yarn test:schema` to verify the static module schemas.
2. Run `yarn tsc --noEmit` to ensure the TypeScript surface stays compatible.
3. Start the dev server (`yarn dev --hostname 0.0.0.0 --port 3000`) in one terminal and execute `npx playwright test tests/apps.smoke.spec.ts` in another. The smoke suite now fails on browser console warnings or errors, so resolve them before publishing.

Once the gate passes, continue with the usual lint/test/build commands listed in the README.
