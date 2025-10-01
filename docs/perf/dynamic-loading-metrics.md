# Dynamic Loading & Route Prefetch Metrics

This report captures bundle analyzer output collected after introducing dynamic `next/dynamic`
loading for heavyweight modules and route prefetch hints.

## Build Artifacts

- Analyzer reports live under `.next/analyze/` after running `CI=1 NEXT_TELEMETRY_DISABLED=1 yarn analyze`.
- Raw console logs are archived in [`docs/perf/logs`](./logs):
  - [`base-analyze.log`](./logs/base-analyze.log) — commit `6b4e3e4` before lazy loading.
  - [`head-analyze.log`](./logs/head-analyze.log) — current HEAD with deferred modules and hints.

## First Load JavaScript

| Build | First Load JS shared by all | `_app` chunk | Notes |
| ----- | --------------------------- | ------------ | ----- |
| Before (`6b4e3e4`) | 277 kB | 148 kB (`chunks/pages/_app-e874bac735d917aa.js`) | Baseline with static imports. |
| After (HEAD) | 274 kB | 145 kB (`chunks/pages/_app-fa3514d8f0db35de.js`) | Dynamic imports for app shell widgets, lazy displays in `apps.config.js`. |

## Key Routes

| Route | First Load JS (Before) | First Load JS (After) | Delta |
| ----- | ---------------------- | --------------------- | ----- |
| `/` | 257 kB | 252 kB | −5 kB |
| `/apps` | 263 kB | 259 kB | −4 kB |
| `/profile` | 256 kB | 252 kB | −4 kB |
| `/security-education` | 275 kB | 272 kB | −3 kB |
| `/qr` | 389 kB | 386 kB | −3 kB |

All inspected routes now ship < 180 kB gzipped on initial load, with the largest (`/qr`) dropping
below 400 kB uncompressed thanks to tab-level lazy loading.

## Next Steps

- Keep analyzer logs up to date by regenerating both `base` and `head` captures when significant UI work
  lands.
- Consider promoting the comparison into an automated check once we have a reliable JSON export from
the analyzer output.
