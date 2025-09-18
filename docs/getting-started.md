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

## Autopsy workflow Playwright spec

The Autopsy desktop simulation now has an end-to-end Playwright spec that exercises mock case imports,
preview panes, heap budgeting, and Lighthouse accessibility scoring. Run it on Chromium with:

```bash
yarn playwright install --with-deps chromium
yarn playwright test tests/autopsy.case-workflow.spec.ts --project=chromium
```

The Playwright configuration starts the development server automatically, so no additional setup is needed
besides a successful dependency install.
