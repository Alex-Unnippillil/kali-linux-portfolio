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

## Form workflows

Interactive tools should drive their validation and submission logic through
the shared [form finite state machine](./form-fsm.md). The `useFormFSM` hook
tracks state transitions, guards submissions, and exposes effect hooks so
components can coordinate API calls without duplicating control flow logic.
