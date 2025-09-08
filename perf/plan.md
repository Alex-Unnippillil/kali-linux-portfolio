# Performance Plan

This document outlines steps to improve LCP, INP, and CLS for `/`, `/apps`, and the three heaviest app routes. It also lists the budgets and checks added in this PR.

## Above-the-fold optimizations
- **Preload LCP images**: hero images on `/` and `/apps` should use `<link rel="preload" as="image">` for the first paint. Heaviest app routes should preload their primary background/hero images.
- **Font loading**: use `next/font` with `display: swap` and preload the Inter subset. Added preconnect headers for Google Fonts to reduce DNS and TLS cost.
- **Image formats**: enable AVIF/WebP output via `next/image` so modern browsers get smaller assets. Ensure images have width/height to avoid CLS.
- **Preconnect**: added `Link` headers to preconnect `fonts.googleapis.com` and `fonts.gstatic.com`.
- **Defer non-critical scripts**: convert blocking scripts to `strategy: 'lazyOnload'` and mark analytics bundles with `defer`.

## Route-level improvements
- `/` and `/apps`: verify hero image dimensions and use CSS `aspect-ratio`.
- **Heavy apps** (`/apps/code-editor`, `/apps/monaco`, `/apps/chess`):
  - Strengthen dynamic imports with explicit boundaries using `next/dynamic` and SSR disabled where possible.
  - Confirm `webpackPrefetch` is used for desktop tiles and opt‑out for multi‑MB modules to avoid wasteful prefetching.

## Performance budgets
- **Largest Contentful Paint** < 2500 ms.
- **Interaction to Next Paint** < 200 ms.
- **Cumulative Layout Shift** < 0.1.
- Bundle budgets enforced via `bundle-budgets.json` and `yarn perf:check`.

## Tooling
- Added `perf/lhci.config.js` and GitHub workflow to run Lighthouse CI against Vercel preview URLs. Job fails if budgets above are exceeded.
- Added bundle size check script `scripts/perf-check.mjs` and `yarn perf:check` script.

## Next.js configuration
- Added global headers for font preconnect and caching tweaks.
- Enabled AVIF/WebP formats in `next.config.js`.

