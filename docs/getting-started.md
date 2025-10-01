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

## Storybook

Component stories live under the top-level `stories/` directory and use Storybook for interactive documentation and testing.

- `yarn storybook` starts a local Storybook instance at http://localhost:6006 with live reload.
- `yarn build-storybook` generates the static Storybook build used by CI and previews.
- `yarn storybook:test` runs the headless interaction test runner, executing each story `play` function in Chromium to verify mouse and keyboard flows.

Run the interaction tests before opening a pull request whenever you add or modify stories so that regressions are caught early.
