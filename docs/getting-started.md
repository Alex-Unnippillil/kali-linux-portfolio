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

## Typography preferences

The desktop `Settings` app lets you adjust body and code fonts, as well as text antialiasing and hinting. Changes update instantly across the workspace via CSS custom properties (`--font-family-body`, `--font-family-code`, and the smoothing variables defined in `styles/globals.css`). If you add new typography options, register them in `hooks/useSettings.tsx` and surface them through the settings preview so users can verify the effect before leaving the panel.
