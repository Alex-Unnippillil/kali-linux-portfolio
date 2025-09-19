# Quarantined Jest suites

Flaky UI tests can make the main CI job unreliable. This guide explains how we quarantine
problematic suites, keep them visible, and graduate them back into the primary pipeline once
they stabilise.

## Tagging flaky tests

Use the Jest helpers registered in `jest.setup.ts` to flag unstable suites or individual cases:

```ts
// Entire suite is flaky
describeFlaky('Hashcat app', () => {
  it('...', () => {
    // test body
  });
});

// A single test is flaky
itFlaky('recovers from transient API errors', async () => {
  // test body
});
```

`describeFlaky`, `itFlaky`, and `testFlaky` behave exactly like their Jest equivalents when the
`RUN_FLAKY` environment variable is set to `true`. Otherwise they call through to `.skip`, so the
main `yarn test` job no longer executes the quarantined code.

## Running the quarantine suite locally

```bash
yarn test:quarantine
```

The helper script automatically scans for files that contain the `*Flaky` helpers and runs them in
band with `RUN_FLAKY=true`. If no quarantined suites exist the script exits quickly.

## Nightly GitHub Action

The `Quarantined Jest suite` workflow (`.github/workflows/nightly-quarantine.yml`) runs every night
at 06:00 UTC and can also be launched manually with **Run workflow**. It installs dependencies and
executes `yarn test:quarantine`. The job writes a short success/failure message to the workflow
summary so we have a quick signal without digging through the logs.

## Current quarantined suites

| Suite | Reason noted | Date added | Exit criteria |
|-------|--------------|------------|---------------|
| `__tests__/hashcat.test.tsx` | UI timing assertions occasionally flake under jsdom timers | 2025-02-13 | Five consecutive nightly passes |
| `__tests__/beef.test.tsx` | Navigation wizard occasionally mis-syncs state updates | 2025-02-13 | Five consecutive nightly passes |
| `__tests__/mimikatz.test.ts` | API handler can emit inconsistent responses in parallel runs | 2025-02-13 | Five consecutive nightly passes |

Update this table whenever a suite is added or graduates back to the main run.

## Triage process

1. **Monitor the nightly workflow.** Subscribe to failure notifications or review the workflow
   history during stand-up. Failures bubble up just like any other CI job.
2. **Debug promptly.** Reproduce locally with `yarn test:quarantine` (optionally with
   `RUN_FLAKY=true yarn jest --watch` for focused debugging).
3. **Stabilise and graduate.** Once a suite has met its exit criteria, replace `describeFlaky` /
   `itFlaky` with the standard Jest helpers and remove its entry from the table above.
4. **Record outcomes.** Note significant changes in `test-log.md` or link to an issue/PR if the fix
   required code changes outside the test itself.

Keeping this loop tight ensures the quarantine remains a short-term holding pen rather than a place
where broken tests linger indefinitely.
