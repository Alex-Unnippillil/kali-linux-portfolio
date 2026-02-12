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

## Workspace Setup

### VS Code configuration

- Open the repository folder in VS Code to automatically pick up the workspace settings in `.vscode/settings.json`.
- Install the recommended extensions when prompted:
  - **ESLint** (`dbaeumer.vscode-eslint`) for inline linting and quick fixes.
  - **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`) for class name completion.
  - **Playwright Test** (`ms-playwright.playwright`) for end-to-end test authoring and debugging.
- Formatting defaults are configured to run Prettier on save and apply ESLint fixes automatically. Trigger a manual save (`Ctrl/Cmd + S`) to format files.
- Launch and debugging profiles are available under the *Run and Debug* panel:
  - **Yarn Dev Server** starts the local Next.js server.
  - **Yarn Test Suite** runs Jest in watchless mode.
  - **Playwright** profiles open Playwright in debug or UI mode to step through E2E tests.

See the [Architecture](./architecture.md) document for an overview of how the project is organized.

For app contributions, see the [New App Checklist](./new-app-checklist.md).
