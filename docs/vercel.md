# Vercel Preview & Production Deployments

This repo supports Vercel Preview deployments **and** optional GitHub Pages exports. Follow the steps below to keep Preview builds deterministic and to prevent Vercel from attempting to build the `gh-pages` branch.

## 1) Ignore `gh-pages` commits in Vercel

Vercel Git integrations can attempt to build any branch they see. The `gh-pages` branch only contains the static export output (`out/`) and does **not** include the Next.js source tree, so Vercel builds will fail if they run there. To avoid that:

1. Open **Vercel → Project → Settings → Git**.
2. Locate **Ignored Build Step**.
3. Paste the command below:

```bash
bash scripts/vercel-ignore-build.sh
```

This script exits `0` (skip build) for `gh-pages`, and `1` (proceed) for all other branches.

## 2) Deterministic installs and builds

Vercel builds should always use Yarn 4.9.2 and a locked install:

- `installCommand`: `corepack enable && yarn install --immutable`
- `buildCommand`: `yarn build`

These are already defined in `vercel.json` so no UI overrides are needed.

## 3) Recommended Preview environment variables

Preview deployments should keep optional features in safe demo mode. Suggested defaults:

| Variable | Suggested Value | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_DEMO_MODE` | `true` | Allows UI to fall back gracefully for services like contact forms. |
| `FEATURE_TOOL_APIS` | `disabled` | Ensures simulated tools stay offline-only. |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | `false` | Avoids sending analytics from preview builds. |
| `NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS` | `false` | Keeps Speed Insights opt-in. |
| `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` | `1` | Skips Playwright browser downloads during Vercel builds. |

> Optional: If you want YouTube/Supabase features in Preview, add the required keys listed in `.env.example`.

## 4) PWA behavior in Preview

The service worker is disabled automatically in Vercel Preview environments to avoid stale caching across PR builds. PWA remains enabled in Production.
