# Application contract guide

This project models expectations between the desktop shell, individual app windows, and mock API stubs by storing JSON Schema definitions and fixtures alongside each app. The goal is to keep UI simulations and service responses stable while making it clear how to evolve them.

## Directory layout

Every app under `apps/*` that exposes an `index.(t|j)sx` entry point receives a `__contracts__` folder with four files:

- `ui.schema.json` – App specific schema that points at the shared UI base definition and locks the `appId`.
- `ui.fixture.json` – A representative payload that Next.js components can rely on when rendering demo content.
- `service.schema.json` – Schema used to describe external interactions (local stubs or remote APIs).
- `service.fixture.json` – Mock payloads and runtime expectations for each endpoint.

Shared base schemas live in `contracts/schemas/*.base.schema.json`. They define the vocabulary that all app level contracts inherit.

## Versioning workflow

1. Update fixtures to reflect the new UI or service behaviour.
2. Bump the `version` field in `ui.fixture.json` and `service.fixture.json`. Use [semantic versioning](https://semver.org/) to signal the impact.
3. Add a changelog entry inside the `metadata.changelog` array to note the reason for the bump.
4. If the schema shape itself changes, adjust the per app `*.schema.json` (or the base schema) and bump its `$id` suffix to avoid cache collisions.
5. Run `yarn contracts:check` to confirm schemas and fixtures still align.
6. Commit the updated files alongside any app or API changes.

## Generating boilerplate

Run the sync script whenever a new app is introduced:

```bash
yarn contracts:sync
```

The script scans `apps/*`, creates missing `__contracts__` folders, and, for known API-backed simulations, seeds default runtime tests. The generated fixtures are intentionally conservative placeholders—edit them to match the real UI expectations.

## Validating contracts

Two entry points keep the contracts healthy:

- `yarn contracts:check` – CLI utility used in CI and `scripts/verify.mjs` to validate every fixture against its schema and execute enabled runtime checks against Next.js API stubs.
- `__tests__/contracts/contracts.test.ts` – Jest coverage that surfaces the same validation inside the unit test suite so regressions appear during local development.

## Updating API runtime checks

When a stub endpoint changes its default response or requires additional headers, update the matching `runtimeTest` object in `service.fixture.json`:

1. Adjust the `mock` payload to mirror the new behaviour.
2. Update `runtimeTest.expectedStatus` and `runtimeTest.responseSchema`.
3. Provide a `runtimeTest.request` shape if the handler now expects headers, cookies, or a request body.
4. Re-run `yarn contracts:check` and `yarn test`.

Keeping these fixtures accurate ensures contract drift is caught before merging and documents how each simulation behaves when feature flags (such as `FEATURE_TOOL_APIS`) are disabled.
