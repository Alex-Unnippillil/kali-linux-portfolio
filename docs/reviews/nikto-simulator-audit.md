# Nikto Simulator Audit

This audit captures the current behavior of the Nikto simulations that live in both the reusable desktop window (`components/apps/nikto/index.js`) and the dedicated app surface under `apps/nikto/`.

## Desktop Window (`components/apps/nikto/index.js`)

- Boots with canned findings pulled from `data/nikto/sample-findings.json` so the table always renders content offline.
- Prefills the command builder with the target data from `data/nikto/sample-target.json` and keeps the builder in sync with UI controls (host/port/SSL, tuning selector, plugin toggles, targets file mode, output format, randomised user agent).
- Surfaces a prominent "Lab mode enforced" banner with a locked checkbox, reinforcing that the builder never executes the command.
- Uses the shared `buildNiktoCommand` helper to add simulation guards (comment suffix) and to keep quoting consistent when options introduce spaces.
- Still supports drag-and-drop parsing for TXT/XML Nikto exports and CSV export of the filtered table.

## App Surface (`apps/nikto/index.tsx`)

- Imports the same fixtures for findings, sample raw log lines, and target defaults to avoid `fetch` calls.
- Mirrors the command builder controls found in the desktop window and pipes values into the shared helper so preview text stays identical across entry points.
- Displays the lab-mode banner and a disabled "Run scan" affordance while still showing a structured target summary (URL, headers, vulnerability buckets) and header lab module.
- Computes summary chips (Critical/Warning/Info) directly from the fixture log and keeps the phase badge (`Phase 3 • n results`) aligned with the fixture size.

## Shared Utilities

- `utils/nikto/buildCommand.ts` centralises command string formatting, handles quoting, and always appends the simulation guard comment.
- Fixture sources live in `data/nikto/` so both React surfaces share the exact same sample findings, log lines, and default target metadata.

> Update this audit whenever either implementation adds new simulation flows, fixture sources, or accessibility affordances so security reviewers can understand parity between the two experiences.
