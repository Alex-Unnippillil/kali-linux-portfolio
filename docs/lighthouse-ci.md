# Lighthouse CI Budget Guide

The CI workflow runs Lighthouse against every Vercel preview so that regressions surface while a pull request is still open. T
he job executes the audit twice—once with the mobile preset and once with the desktop preset—using the budgets defined in `light
houserc.json`.

## Budgets that gate the PR

| Form factor | Largest Contentful Paint (LCP) | Interaction to Next Paint (INP) | Cumulative Layout Shift (CLS) |
|-------------|--------------------------------|---------------------------------|-------------------------------|
| Mobile      | ≤ 2.8 s (median)               | ≤ 200 ms (median)               | ≤ 0.10 (p75)                  |
| Desktop     | ≤ 2.2 s (median)               | ≤ 200 ms (median)               | ≤ 0.07 (p75)                  |

Lighthouse CI reports these thresholds as warnings today; repeated warnings or large metric deltas in the PR comment mean the c
hange needs attention before merge.

## How to recover when a budget is exceeded

- **Largest Contentful Paint**
  - Prioritize above-the-fold assets (hero image, wallpaper, hero copy) with `priority` images, optimized formats, and tighter `s
izes` declarations.
  - Defer non-critical scripts and heavy app bundles with `dynamic(() => import(), { ssr: false })` or split routes so the deskto
p shell loads first.
  - Audit Vercel logs for cache misses; add CDN headers or `revalidate` timings to reduce server wait.
- **Interaction to Next Paint**
  - Minimize main-thread work triggered during input handlers. Move expensive tasks to Web Workers or use `requestIdleCallback` f
or background hydration.
  - Replace synchronous state setters with batched updates (`startTransition`, `useDeferredValue`) when reacting to large data s
ets.
  - Guard third-party embeds behind interaction ("click to load") to prevent long tasks during boot.
- **Cumulative Layout Shift**
  - Reserve space for dock, window chrome, and hero art by setting explicit height/width or aspect ratios.
  - Wrap async content (e.g., app tiles, analytics banners) in skeletons with fixed dimensions so layout stays stable while load
ed.
  - Audit font swapping; if a custom font causes shifts, include a fallback metric-compatible font or preload the webfont.

## Local verification

1. Deploy the branch locally with `yarn dev` and run Lighthouse in Chrome DevTools using the same device presets.
2. For repeatability, run `npx lhci collect --config=./lighthouserc.json --collect.url=http://localhost:3000`.
3. Compare results against the PR comment. If deltas remain high, land fixes before requesting review.
