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

## Pull Request Checklist Guard

The CI workflow runs a `pr-template-guard` job before other checks. It fails when:

- Required checklist items in the pull request template are left unchecked.
- The **Summary** section is left blank or filled with placeholders.
- The **Testing** section does not record checked tests (or explicitly mark them as not applicable).
- The **Issue** section does not link to an issue or clearly note that no issue applies.

Update the pull request description accordingly so the guard can pass without reruns.
