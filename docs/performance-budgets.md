# Performance budgets and measurement notes

## Latest measurement attempt
- **Date:** 2025-10-13
- **Tooling:** WebPageTest public API (`runtest.php`) against `https://unnippillil.com`.
- **Status:** Blocked by the Cloudflare challenge protecting WebPageTest (`Just a moment…` response). The attempt is recorded in `/tmp/wpt.txt` for reference.
- **Follow-up:** Re-run from an environment that can solve the challenge or authenticate with an API key. As a fallback, run Lighthouse or PageSpeed Insights once Chromium is available (the current container lacks a Chrome binary, which caused `CHROME_PATH` errors when invoking `npx lighthouse`).

## Target budgets
These thresholds align with the site’s desktop-first UX while matching the polish checklist in `docs/TASKS_UI_POLISH.md`.

| Metric | Budget | Rationale |
| --- | --- | --- |
| Largest Contentful Paint (LCP) | ≤ 2.1 s | Boot logo + first desktop icons now fetch with high priority. |
| Interaction to Next Paint (INP) | ≤ 200 ms | Ensures window chrome interactions stay responsive. |
| Total Blocking Time (TBT) | ≤ 150 ms | Matches expectation for fast taskbar interactions. |
| Cumulative Layout Shift (CLS) | ≤ 0.02 | Desktop grid reserves icon space; no unexpected shifts. |
| First Byte (TTFB) | ≤ 600 ms | Assumes Vercel edge deployment with cached shell. |

## How to verify going forward
1. Deploy or run `yarn dev` locally.
2. Use `npx @lhci/cli collect --url=<URL> --only-categories=performance --chrome-path=/path/to/chrome` after installing Chromium (`npx playwright install chromium`).
3. For WebPageTest, authenticate with an API key and set `fvonly=1&runs=3` to mirror CI budgets; parse the JSON `data.average.firstView` section.
4. Compare results with the table above; update the budgets when sustained production data shows better headroom.

