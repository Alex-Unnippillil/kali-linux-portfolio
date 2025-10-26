# Budget Policy

This policy gives contributors concrete targets for performance, assets, and third-party spend so the project stays fast and low-cost. Treat it as a checklist before merging any feature that could affect load time or introduce a recurring expense.

## Scope and intent

- Applies to all PRs that ship UI, data, build tooling, or integrations.
- Focus on sustainable defaults: fast initial load, modest CPU/GPU usage, and zero surprise invoices.
- When in doubt, open an issue to discuss trade-offs before building.

## Performance budgets

| Budget | Target | Notes |
| --- | --- | --- |
| Initial JavaScript (compressed) | ≤ **250 KB** | Bundle-split aggressively; prefer dynamic imports for heavy apps and libraries. |
| Initial CSS (compressed) | ≤ **100 KB** | Tailwind is tree-shaken; keep custom CSS modular and purge unused selectors. |
| Largest Contentful Paint | ≤ **2.5 s** on mid-tier laptop & mobile (throttled) | Validate with Lighthouse or WebPageTest using the production build. |
| Total blocking time | ≤ **200 ms** | Watch for synchronous loops, unthrottled timers, and layout thrash. |
| App-specific lazy chunks | ≤ **150 KB** per feature | Split large tools/games into multi-step loaders if needed. |

**Checklist**

- Use `yarn lint`, `yarn build`, and `yarn smoke` locally; fix regressions before review.
- Record perf numbers in the PR description when touching shell components, desktop manager, or shared hooks.
- Prefer streamed data and pagination over loading entire datasets.
- Add automated guards (bundle analyzer, Lighthouse CI) when introducing new dependencies that affect the bundle.

## Asset budgets

- Prefer SVG for icons/illustrations. Raster assets should be **≤ 300 KB** (compressed) unless absolutely necessary.
- Large background images must ship WebP/AVIF variants and include a blurred placeholder.
- Audio longer than 15 seconds and videos longer than 5 seconds require explicit approval; transcode to web-friendly codecs.
- Store reusable assets in `public/` with lossless compression and document their source/license.

## Third-party services and SaaS spend

- Default to free tiers or self-hosted alternatives. Any paid tier must be pre-approved by the maintainer.
- New SaaS/SDK integrations need a cost table (free, usage, overage) in the PR description and a rollback plan.
- Disable analytics or optional network calls behind feature flags when credentials are absent (`NEXT_PUBLIC_ENABLE_ANALYTICS`, `FEATURE_TOOL_APIS`, etc.).
- Never store secrets in the repo; use `.env.local` for local overrides and document required keys in README/docs.

## Dependency and tooling guardrails

- Favor existing libraries already in `package.json`. Adding a dependency requires justification covering bundle impact, maintenance risk, and license.
- Remove unused packages when deprecating features to keep install size and audit surface small.
- For Playwright/Jest helpers, reuse shared utilities instead of bundling large fixtures into tests.

## Requesting exceptions

1. Open an issue describing the proposed change, budgets affected, and why the exception is needed.
2. Include measurement screenshots or logs (Lighthouse, WebPageTest, bundle analyzer) where applicable.
3. Maintainers will review trade-offs and update this policy if a permanent adjustment is approved.

Sticking to these guidelines keeps the Kali Linux Portfolio responsive for visitors and affordable to operate for everyone involved.
