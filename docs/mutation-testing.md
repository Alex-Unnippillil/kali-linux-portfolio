# Mutation Testing Workflow

This guide explains how the project runs [Stryker](https://stryker-mutator.io/) to measure mutation score and how to interpret the reports when improving tests.

## Running Stryker locally

```bash
yarn install
yarn mutation:test
```

Key facts:
- The command uses the Jest runner with per-test coverage so mutated files in `utils/`, `modules/`, `services/`, `hooks/`, and `lib/` get re-tested efficiently.
- Reports are written to `reports/mutation/` (`index.html` and `mutation.json`). The directory is ignored by Git but uploaded from CI when available.
- Thresholds enforce a minimum mutation score of **70%** (`break`), with warning and success targets at 70% and 80% respectively. The command exits non-zero if the score drops below the break threshold.

## Reading the HTML report

1. Open `reports/mutation/index.html` after a run.
2. The dashboard lists:
   - **Mutation score** – overall percentage of killed mutants. Keep this ≥70%.
   - **Survived mutants** – lines that tests did not exercise. Prioritize these files when writing new assertions.
   - **No coverage** – code not hit by any test. Consider adding unit tests before tweaking the logic.
3. Click a file name to view inline annotations. Each mutant includes:
   - The operator that changed (e.g., `ConditionalExpression`, `ArithmeticOperator`).
   - The mutated code snippet.
   - A status badge (`Killed`, `Survived`, `No Coverage`, or `Timeout`).
4. Use the breadcrumb at the top of the report to navigate back to the summary.

## Triaging failures

When CI fails on the mutation step:
- Download the `mutation-report` artifact from the workflow run. It contains the same `reports/mutation` folder generated locally.
- Inspect survived mutants first. They usually indicate missing assertions or guard clauses that never run.
- If a mutant highlights logic that should remain untouched (e.g., deliberate fallbacks or defensive code), add a focused unit test rather than raising thresholds. Mutation failures should motivate better coverage, not higher tolerance.

## Best practices for stronger scores

- Prefer deterministic helpers in `utils/` when possible; use dependency injection or parameter overrides to make them testable.
- Reset module state with `jest.resetModules()` in tests targeting singleton utilities so each assertion gets a clean instance.
- Exercise both success and fallback branches (e.g., feature detection that gates browser-only APIs) to prevent `No Coverage` mutants.
- Keep mutation runs targeted by updating `stryker.conf.json` if critical modules move or new directories require protection.

Following this workflow keeps the mutation score transparent and actionable for contributors and reviewers.
