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

## Safe storage helpers

Use `createSafeStorage` from `utils/safeStorage` when you need persistent browser
state. It accepts an optional `backend` parameter so you can target
`localStorage` (default) or `sessionStorage`. The helper probes the selected
storage to ensure it is available before returning it, allowing your feature to
fall back gracefully when storage is unavailable.

```ts
import { createSafeStorage } from '../utils/safeStorage';

const sessionSafeStorage = createSafeStorage({ backend: 'session' });
```
