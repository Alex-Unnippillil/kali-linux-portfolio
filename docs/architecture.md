# Architecture

The project is a desktop-style portfolio built with Next.js.

- **pages/** wraps applications using Next.js routing and dynamic imports.
- **components/apps/** contains the individual app implementations.
- **pages/api/** exposes serverless functions for backend features.

## Lazy loaded app routes

- Non-core app routes under `pages/apps/*` are created with
  `createSuspenseAppPage`. The helper (see
  [`utils/createSuspenseAppPage.tsx`](../utils/createSuspenseAppPage.tsx)) wraps
  a `next/dynamic` import with React Suspense so we can show a consistent
  loading UI while the app bundle streams in.
- The Suspense fallback rendered across these routes lives in
  [`components/ui/AppSuspenseFallback.tsx`](../components/ui/AppSuspenseFallback.tsx).
  The component keeps loading states accessible and consistent with the desktop
  shell styling.
- The application index at `/apps` manually prefetches app routes on hover using
  `router.prefetch`, which keeps the initial bundle light while preserving
  responsive navigation once a user expresses intent.

For setup instructions, see the [Getting Started](./getting-started.md) guide.
