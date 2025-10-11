# Nessus fixture maintenance

The Nessus desktop app runs entirely in lab mode. Instead of requesting data
from a Tenable server it loads JSON fixtures stored in
`components/apps/nessus/fixtures/`. Keeping those fixtures fresh makes the demo
useful during workshops and static exports.

## Fixture files

- `scan-1.json` – external perimeter baseline sample
- `scan-2.json` – internal validation follow-up

Each entry in a fixture must provide the following fields so the UI, charts, and
CSV export continue to work without runtime guards:

```json
{
  "id": "unique-plugin-id",
  "name": "Finding title",
  "cvss": 7.5,
  "severity": "Critical | High | Medium | Low | Info",
  "host": "host.example.com",
  "pluginFamily": "Family label",
  "description": "Why the issue matters",
  "solution": "Next step to remediate"
}
```

Use neutral, de-identified language when adding new findings. The fixtures live
in the repo so they must not contain customer systems, IPs, or timestamps.

## Refresh workflow

1. Export a `.nessus` report from a lab-only scan and strip any sensitive
   metadata before committing.
2. Convert the XML to JSON using the worker in `workers/nessus-parser.ts` or the
   Jest helper (`yarn test nessusParser`).
3. Group the findings into scenario-based fixture files and double-check that
   the `severity` values match the casing above. The simulator normalises the
   strings but avoids surprises by keeping the JSON tidy.
4. Run `yarn test` to ensure `__tests__/nessus-app.test.tsx` and related suites
   still reflect the updated counts and descriptions.
5. Update this checklist if a new field becomes required or if additional
   fixtures are introduced.

Keeping this process documented helps reviewers understand changes to the sample
data and avoids regressions when new analysts contribute training material.
