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

## Dev Mode extensions

Set `NEXT_PUBLIC_DEV_MODE=true` (or run `yarn dev`) to expose the extension
examples that live under `extensions/examples`. The `hello-world` sample
demonstrates manifest contributions, a UI panel, settings defaults, and
permission declarations. After enabling Dev Mode, open the **Plugin Manager**
app to install the example and inspect the emitted log output and manifest
details.

See the [Architecture](./architecture.md) document for an overview of how the project is organized.

For app contributions, see the [New App Checklist](./new-app-checklist.md).
