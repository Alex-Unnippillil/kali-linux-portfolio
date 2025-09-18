# Testing and quality gates

This project uses a mix of linting, unit tests, and end-to-end checks to keep
the Kali-style desktop stable.

## Summary of automated suites

| Gate | Command | Notes |
| --- | --- | --- |
| ESLint | `yarn lint` | Static analysis with repo rules. |
| Jest | `yarn test` | Unit coverage for utilities and React components. |
| Playwright (pages) | `npx playwright test --project=pages` | Runs smoke coverage under `tests/`. |
| Playwright (SSH simulator) | `npx playwright test --project=ssh-simulator` | Validates the SSH simulator flows, SFTP sidecar, and port forwarding controls. |

## SSH simulator regression

The SSH Command Builder now ships with a Playwright scenario that exercises the
multi-tab session manager and the supporting sidecars. The spec lives at
`playwright/tests/ssh-simulator.spec.ts` and covers:

- Opening two SSH sessions to ensure tab lifecycle events remain wired.
- Triggering the mock SFTP queue and waiting for a transfer to complete.
- Toggling port forwards to verify UI state updates without errors.
- Collecting console output to guarantee no runtime exceptions leak to the
  developer tools.
- Instrumenting `performance.memory.usedJSHeapSize` and `PerformanceObserver`
  entries so the run fails if heap usage grows by more than **8 MB** or any input
  latency exceeds **100 ms**.

Run the test in isolation with:

```bash
npx playwright test --project=ssh-simulator
```

The suite expects the Next.js dev server to be running on
`http://localhost:3000` (override with `BASE_URL`).

## Notes

- All tooling must stay within the simulation boundary—no network calls leave
the local environment.
- When adding new apps or regression checks, document the gate here so CI and
contributors can opt in.
