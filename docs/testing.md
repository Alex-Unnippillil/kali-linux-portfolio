# Testing Guidance

## Accessibility thresholds
- **Location**: `playwright/a11y.spec.ts`
- **Command**: `npx playwright test playwright/a11y.spec.ts`
- **Limits**:
  - Critical violations: ≤ 0
  - Serious violations: ≤ 0
  - Moderate violations: ≤ 10
  - Minor violations: ≤ 50

The spec enforces these caps for every audited route, so exceeding any threshold fails the run.

## Data converter workflow
- **Location**: `playwright/tests/data-converter.spec.ts`
- **Command**: `npx playwright test playwright/tests/data-converter.spec.ts`
- **Checks**:
  - Formats JSON input, produces YAML output, validates against the embedded schema, and clears the editors.
  - Fails if any browser console errors are emitted during the flow.
  - Asserts JavaScript heap growth stays within +6 MB for the end-to-end scenario.
  - Exercises keyboard navigation across all copy buttons to guarantee focus order is accessible.

## Verify script
Running `yarn verify:all` now installs dependencies, lints, type-checks, builds, starts the production server, performs route smoke checks, and executes the full Playwright suite (including the specs above) against the started instance.
