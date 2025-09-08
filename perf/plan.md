# Performance Plan

This document outlines steps to improve LCP, INP, and CLS for `/`, `/apps`, and the three heaviest app routes. It also lists the budgets and checks added in this PR.

## Above-the-fold optimizations
- **Preload LCP images**: hero images on `/` and `/apps` should use `<link rel="preload" as="image">` for the first paint. Heaviest app routes should preload their primary background/hero images.
- **Font loading**: use `next/font` with `display: swap` and preload the Inter subset. Preconnect to `fonts.googleapis.com` and `fonts.gstatic.com` to reduce DNS and TLS cost.
- **Image formats**: enable AVIF/WebP output via `next/image` so modern browsers get smaller assets. Ensure images declare width/height to avoid CLS.
- **Preconnect**: add `Link` headers to preconnect `fonts.googleapis.com`, `fonts.gstatic.com`, and critical analytics origins.
- **Defer non-critical scripts**: convert blocking scripts to `strategy: 'lazyOnload'` and mark analytics bundles with `defer`.

## Bundles and dynamic imports
- Split large modules (Monaco, code-editor, chess engine) using `next/dynamic` and `ssr: false` so they only load when needed.
- Audit `webpackPrefetch`; keep it for small desktop tiles but opt out for multi‑MB modules to avoid wasteful prefetching.

## Performance budgets
- **Largest Contentful Paint** < 2500 ms.
- **Interaction to Next Paint** < 200 ms.
- **Cumulative Layout Shift** < 0.1.
- Bundle budgets enforced via `bundle-budgets.json` and `yarn perf:check`.

## Tooling
- `perf/lhci.config.js` and GitHub workflow run Lighthouse CI against Vercel preview URLs; the job fails if budgets are exceeded.
- `yarn perf:check` compares `.next` stats against `bundle-budgets.json` to keep bundles lean.

## Next.js configuration
- Add global headers for font preconnect and page caching.
- Enable AVIF/WebP formats with long‑term caching for image assets.
- Cache HTML for `/` and `/apps` using `s-maxage=600, stale-while-revalidate=60`.
