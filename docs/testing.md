# Testing Overview

## HTTP Client Regression Spec

The Playwright spec at `playwright/tests/http-client.spec.ts` exercises the HTTP Request Builder app end-to-end. It issues a
mixture of 20 GET/POST/PUT/DELETE requests against a mocked `/api/http-client-test` endpoint while rotating through the local,
staging, and production request tabs. Each scenario verifies the generated curl preview, records latency probes, and persists
the request definition so the final "collection" export can be validated as a JSON download.

### Acceptance thresholds

- **Console stability:** zero `pageerror` and console error events are allowed during the run.
- **Cumulative Layout Shift:** the PerformanceObserver-driven CLS accumulator must stay at or below `0.02`.
- **Input responsiveness:** every latency probe recorded after typing into the URL field must remain under `120 ms`.
- **Memory usage:** the ratio `usedJSHeapSize / jsHeapSizeLimit` (when `performance.memory` is available) must remain below `0.9`.

### How to run the spec locally

```bash
npx playwright install --with-deps
yarn dev &
npx wait-on http://localhost:3000
npx playwright test playwright/tests/http-client.spec.ts
```

The test emits a downloadable `http-collection.json` artifact and annotates the Playwright report with heap usage information
when precise heap metrics are supported by the browser.
