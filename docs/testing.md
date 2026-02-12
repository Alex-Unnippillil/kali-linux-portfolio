# Testing Playbook

## Kismet end-to-end validation

The `playwright/kismet.spec.ts` scenario exercises the simulated Kismet analyzer
from the desktop shell and verifies that long-running scans clean up after
themselves.

### What the test covers

- Launches the full desktop (`/`) experience, opens the "Show Applications" grid,
  and double-clicks **Kismet** to open its windowed simulation.
- Uploads an in-memory `.pcap` payload that spans **3 minutes** of beacon traffic
  (timestamps from 0 to 180 seconds) so the table, channel histogram, and time
  series all render with representative data.
- Confirms the parsed networks table contains the expected SSIDs, BSSIDs,
  channels, and frame counts and that both the channel and time charts render
  with the correct buckets.
- Synthesizes an "Export CSV" interaction by reading the table, triggering a
  download, and asserting that the saved CSV matches the table contents.
- Instruments `setInterval`/`clearInterval` and `requestAnimationFrame`/`cancelAnimationFrame`
  to capture baseline timer counts, then ensures the counts return to baseline
  after the window is closed.
- Hooks Chromium's DevTools protocol to take heap snapshots before the scan and
  after the window closes, asserting that memory usage returns to within **+6 MB**
  of the pre-scan baseline.
- Pipes every console entry through a leak detector and fails the run if any
  message contains the word "leak".

### Running the scenario locally

```bash
# Start the Next.js dev server in one terminal
yarn dev

# In another terminal, run the Chromium-only Playwright scenario
npx playwright test playwright/kismet.spec.ts --project=chromium
```

During the run Playwright stores the exported CSV and both heap snapshots under
`playwright-report/` (or the directory configured by `testInfo.outputDir`). These
artifacts can be inspected manually if the resource assertions fail.
