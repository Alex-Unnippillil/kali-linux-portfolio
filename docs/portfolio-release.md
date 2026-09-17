# Portfolio-first engineering release

The root is a server-rendered overview. `?desktop=1` opens the retained Linux desktop; `?overview=1` returns to reading. The remember option is explicit, local, storage-failure tolerant, and reversible. Public `/about`, `/projects`, `/projects/[slug]`, and `/contact` routes do not need desktop interaction.

Narratives live in `data/projects.json`; verified provenance lives in `data/github-projects.json`. `lib/portfolio.ts` combines committed data with no runtime GitHub request. Featured status fails closed for unknown metadata, forks and archived repositories. Non-fork status alone is not proof of authorship. No unverified contribution or impact metrics are claimed.

`public/projects.json` is a generated compatibility mirror. Run `node scripts/sync-portfolio.mjs` after editing narratives; pass `--check` to detect drift. ProjectCatalog is shared between reading routes and the main desktop gallery. Legacy About project renderers still need consolidation.

Hydra, John, radare2, Mimikatz and NSE APIs are bounded educational fixtures with no command execution, target connections or saved input files. Reviewed Nessus, Recon-ng and Wireshark changes remove live scanner and capture connections. This is not an official Kali product.

Telemetry SDKs require the explicit `NEXT_PUBLIC_ANALYTICS_ENABLED=true` deployment opt-in; Speed Insights additionally requires `NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS=true`. This is deployment-level opt-in, not a new visitor consent mechanism. Preview builds do not register the production service worker.

Core checks: `yarn install --immutable`, `yarn lint`, `yarn typecheck`, `yarn test --coverage --maxWorkers=2`, `yarn build`, `yarn export`, `yarn dedupe:check`, `yarn npm audit --severity high`. Browser gate: `yarn playwright install chromium`, `yarn build`, `yarn playwright test --config=playwright.portfolio.config.ts`. The browser suite captures eight viewport sizes, tests reading without JavaScript, project search/provenance, contact, keyboard skip links, axe checks, desktop entry preference and reduced motion. Artifacts contain actual screenshots and failures; passing coverage must not be inferred from their existence.

CI gates run independently. Vercel Git integration owns previews. Production is unchanged. This branch remains draft until its own checks, browser QA and a READY preview are verified. Baseline blockers include lockfile deduplication, dependency audit findings and Vercel resource-provisioning failures before compilation; changing Actions is not claimed to repair provisioning.
