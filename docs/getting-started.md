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

## Git Hooks

This repository uses [Husky](https://typicode.github.io/husky) to install Git hooks automatically. After installing dependencies, the `prepare` script runs `husky` so that pre-commit checks are ready for the next commit.

During commits, staged JavaScript and TypeScript files run through ESLint, targeted Jest runs, and TypeScript checks via `lint-staged`. Fix any reported issues before committing to keep the main branch healthy.

### Bypassing Hooks in Emergencies

If a hook blocks an urgent hotfix, obtain approval from a maintainer first. With that approval, you can temporarily skip Husky by prefixing the commit command:

```bash
HUSKY=0 git commit -m "chore: unblock release"
```

Follow up by addressing the failing checks (or reverting the change) so the next commit runs the hooks again.

See the [Architecture](./architecture.md) document for an overview of how the project is organized.

For app contributions, see the [New App Checklist](./new-app-checklist.md).
