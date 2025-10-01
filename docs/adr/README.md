# Architecture Decision Records (ADRs)

This directory captures the high-level architectural decisions that shape the Kali Linux Portfolio experience. ADRs provide institutional memory for choices that affect developer experience, performance, security posture, and product behaviour.

## How ADRs are organized

- **Location:** All ADRs live under `docs/adr/`.
- **Template:** Start from [`_template.md`](./_template.md) when drafting a new ADR.
- **File name:** `NNNN-short-title.md` where `NNNN` is a zero-padded sequence (e.g., `0006-new-data-source.md`). Keep the short title lowercase and kebab-cased.
- **Identifier:** Use the prefix `ADR-NNNN` in the document title to match the file name.
- **Status lifecycle:** `Proposed` → `Accepted` or `Rejected` → optionally `Superseded`/`Deprecated`.
- **Source control:** Each ADR must land via pull request so discussion is preserved in review comments.

## Contribution workflow

1. **Open an issue or discussion.** Describe the problem and the architectural trade-offs that need a decision. Tag it with `adr`.
2. **Draft the ADR.** Copy `_template.md` to a new `NNNN-short-title.md` file, filling in context, decision, consequences, and references. Link to any related ADRs.
3. **Request feedback early.** Convert the PR to draft and share with maintainers or the relevant working group to confirm the direction.
4. **Iterate during review.** Update the ADR until the reviewers agree on the decision. Keep the status as `Proposed` until approval.
5. **Approval.** A core maintainer changes the status to `Accepted` (or `Rejected`) before merging. If an ADR supersedes another, update both records.
6. **Post-merge follow-up.** Update onboarding or implementation docs if the decision affects existing guidance. Schedule any migrations in the changelog or project board.

## Index

| ADR | Title | Status | Summary |
| --- | ----- | ------ | ------- |
| [ADR-0001](./0001-worker-architecture.md) | Worker architecture | Accepted | Define when to use dedicated workers and how they integrate with Next.js bundles. |
| [ADR-0002](./0002-caching-strategy.md) | Caching strategy | Accepted | Document service worker scope, SSG/ISR usage, and when to avoid API caching. |
| [ADR-0003](./0003-internationalization-approach.md) | Internationalization approach | Accepted | Establish the baseline English locale and how to add localized copy safely. |
| [ADR-0004](./0004-telemetry-and-analytics.md) | Telemetry and analytics | Accepted | Clarify permitted analytics providers, gating, and data minimization. |
| [ADR-0005](./0005-graph-rendering-strategy.md) | Graph rendering strategy | Accepted | Favor lightweight, accessible visualizations over heavyweight charting libraries. |

## Maintaining the sequence

- Use the next integer in the sequence when adding an ADR. Do not reorder or renumber existing records.
- Reserve a number by submitting a PR with a placeholder if multiple ADRs are drafted concurrently.
- Superseded ADRs keep their file names and numbers; link to the replacement ADR in both documents.
