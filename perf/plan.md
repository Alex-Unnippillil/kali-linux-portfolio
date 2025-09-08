# Performance Plan

This document outlines steps to improve LCP, INP, and CLS for `/`, `/apps`, and the three heaviest app routes. It also lists the budgets and checks added in this PR.

## Above-the-fold optimizations
- **Preload LCP images**: `/` preloads `/wallpapers/wall-1.webp` via a `Link` header. Similar preloads are recommended for the first app tile on `/apps` and for hero assets in heavy apps.
- **Font loading**: use `next/font` with `display: swap` and preload the Inter subset. Preconnect headers reduce the DNS and TLS cost of Google Fonts.
- **Image formats**: serve AVIF/WebP with `next/image` and always specify dimensions to avoid CLS.
- **Preconnect**: `Link` headers preconnect to `fonts.googleapis.com` and `fonts.gstatic.com`.
- **Defer non-critical scripts**: convert blocking scripts to `strategy: 'lazyOnload'` and mark analytics bundles with `defer`.

## Route-level improvements
- `/` and `/apps`: verify hero and thumbnail dimensions and use CSS `aspect-ratio`.
- **Heavy apps** (`/apps/vscode`, `/apps/project-gallery`, `/apps/chess`):
  - Strengthen dynamic imports with `ssr: false` and explicit `webpackPrefetch: false` to avoid eager downloading of multi‑MB bundles.
  - Further split editor features with dynamic imports where possible.

## Performance budgets
- **Largest Contentful Paint** < 2500 ms.
- **Interaction to Next Paint** < 200 ms.
- **Cumulative Layout Shift** < 0.1.
- Bundle budgets enforced via `bundle-budgets.json` and `yarn perf:check`.

## Tooling
- Added `perf/lhci.config.js` and GitHub workflow to run Lighthouse CI against Vercel preview URLs. Job fails if budgets above are exceeded.
- Added bundle size check script `scripts/perf-check.mjs` and `yarn perf:check` script.

## Next.js configuration
- Added a `Link` header to preload the homepage hero image and global font preconnect headers.
- Enabled AVIF/WebP formats and long‑term caching for static assets in `next.config.js`.
- Turned on `experimental.optimizeCss` to shrink stylesheet output.

