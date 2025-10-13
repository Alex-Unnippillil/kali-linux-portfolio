# Architecture

The project is a desktop-style portfolio built with Next.js and organized as a monorepo.

- **apps/web/** hosts the Next.js workspace (Pages + App Router), desktop shell, and window management logic.
- **apps/web/components/apps/** contains the individual app implementations rendered inside the desktop windows.
- **apps/web/pages/api/** exposes serverless routes that back simulated tooling during serverful builds.
- **packages/ui/** ships shared React primitives (tooltips, toasts, tabbed window frames) consumed by desktop apps.
- **packages/config/** centralizes ESLint, Jest, and TypeScript configuration consumed by every workspace.

For setup instructions, see the [Getting Started](./getting-started.md) guide.
