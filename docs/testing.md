# Testing gates and instrumentation

## QR tool E2E guardrails

The Playwright spec at `playwright/tests/qr-tool.spec.ts` exercises the QR laboratory end-to-end: it mocks the media stream, feeds three deterministic scan payloads, generates five QR codes across the form modes, and exports a ten-entry CSV batch. While those transfers run, the test instruments `requestAnimationFrame` to make sure the desktop shell stays responsive.

### Frame pacing

* **Average frame delta:** must stay below **40 ms** (≈25 FPS) across the run.
* **95th percentile frame delta:** must stay below **80 ms** to catch long scheduling gaps.

### Input latency

* **Average requestAnimationFrame latency:** must remain under **35 ms**.
* **95th percentile latency:** must remain under **60 ms** even while export/download work executes.

The spec also fails if console errors are emitted or if the mocked camera track fails to report `readyState === "ended"` after the scan cycle. Run it locally with:

```bash
npx playwright test playwright/tests/qr-tool.spec.ts
```
