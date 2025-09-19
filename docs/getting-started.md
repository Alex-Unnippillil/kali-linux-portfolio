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

To exercise PWA/service-worker behaviour that requires a secure context, install [`mkcert`](https://github.com/FiloSottile/mkcert),
run `yarn cert:local`, and start `yarn dev:https` to serve the app over HTTPS. See the root README for the complete walkthrough.

See the [Architecture](./architecture.md) document for an overview of how the project is organized.

For app contributions, see the [New App Checklist](./new-app-checklist.md).
