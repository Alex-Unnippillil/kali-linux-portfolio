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

## Multi-user workflows

The desktop shell now supports rapid user switching without a full logout. When the feature is enabled (it is on by default), open the status menu and select **Switch user** to launch the session overlay. The overlay lists every cached desktop workspace, highlights the active session, and displays whether each workspace is locked.

- Selecting **Switch** resumes the chosen workspace in place, restoring window layout and dock pins within a couple of seconds.
- Use **Lock/Unlock** to toggle session security without closing running apps.
- Administrators can disable the overlay entirely by setting `NEXT_PUBLIC_ENABLE_USER_SWITCHER=disabled` in the environment configuration.

These controls are intended for multi-role demos—e.g., jumping between “Analyst” and “Guest” contexts—while keeping the simulated tooling state alive.
