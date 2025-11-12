# Architecture

The project is a desktop-style portfolio built with Next.js.

- **pages/** wraps applications using Next.js routing and dynamic imports.
- **components/apps/** contains the individual app implementations.
- **pages/api/** exposes serverless functions for backend features.
- **workers/** houses browser and utility workers that rely on TypeScript's built-in DOM/WebWorker library definitions rather than custom shims.

For setup instructions, see the [Getting Started](./getting-started.md) guide.
