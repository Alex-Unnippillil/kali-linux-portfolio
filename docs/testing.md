# Testing Reference

## Subnet Calculator E2E Gate

The subnet calculator workflow is covered by a gated Playwright suite located at
`playwright/tests/subnet-calculator.spec.ts`. The scenario seeds 50 random IPv4
and IPv6 calculations, exercises keyboard navigation, exports the grid to CSV,
re-loads the app, and re-imports the saved file while checking that no
exceptions are raised and heap usage growth stays below 6 MB in Chromium.

Because the workflow is resource intensive, the suite is disabled by default.
Enable it by starting the dev server (`yarn dev`) and setting the
`SUBNET_E2E=1` environment variable before launching Playwright:

```bash
SUBNET_E2E=1 npx playwright test playwright/tests/subnet-calculator.spec.ts
```

The helpers inside the spec intentionally accept multiple selector shapes so
the test can run against both local development builds and production snapshots
without DOM-specific tweaks.

## Related Unit Tests

CSV helpers that back the export/import flow live in
`apps/subnet-calculator/csv.ts` and are exercised by
`__tests__/apps/subnet-calculator/csv.test.ts`. Run them with the standard Jest
command:

```bash
yarn test __tests__/apps/subnet-calculator/csv.test.ts
```

These tests validate round-tripping, BOM/CRLF handling, quoting, and filtering
of malformed rows.
