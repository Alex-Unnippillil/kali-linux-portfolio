# OpenVAS simulator audit

_Last updated: 2024-05-22_

The desktop OpenVAS app (`components/apps/openvas/index.js`) is still a training
simulation. The following pieces remain stubbed or rely on canned data:

- **Scan executor.** Runs against `/api/openvas` which is a thin demo endpoint.
  Responses are parsed client-side; no network scanning occurs.
- **Parser worker.** `openvas.worker.js` extracts severity, impact, and
  likelihood markers from plain text output to populate the findings grid.
- **Policy templates.** JSON templates under `components/apps/openvas/templates/`
  provide canned PCI and HIPAA policies for the sidebar editor.
- **Task overview.** `task-overview.js` renders static charts and history cards
  that reinforce the “for lab use only” story.

## Fixture pipeline

The app now hydrates from a bundled scan report fixture with an offline
fallback:

1. Primary data lives in `public/fixtures/openvas-report.json`. It contains
   metadata, timeline events, host summaries, and host-level vulnerabilities.
2. On mount, the component fetches this fixture. When the request fails (for
   example in static export) it falls back to a local `fallbackReport`
   structure that mirrors the JSON schema.
3. `flattenFindings` normalises host data into a severity list used by the
   summary matrix, severity chart, and remediation dialog.
4. Host details stay keyed by `host` so the detail view can surface services,
   remediation tags, and references without recomputing.
5. When the user kicks off a scan, worker output replaces the aggregated
   findings list but the fixture-driven host detail view remains available for
   training context.

To update the fixture:

- Edit `public/fixtures/openvas-report.json`, keeping the shape documented above.
- Mirror any new fields in the `fallbackReport` constant and in the
  `flattenFindings` helper.
- Extend the Jest suite (`__tests__/openvas.test.tsx`) if new sections require
  interaction coverage.

## UX additions

- Summary and detail views are exposed via an accessible tablist with Lab Mode
  warnings handled by `components/LabMode.tsx`.
- Offline fallback warnings render when the fixture fetch fails.
- Host detail view surfaces observed services and remediation tags directly in
  the panel while the modal drill-down retains CVSS/EPSS context links.
