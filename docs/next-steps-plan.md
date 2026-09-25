# Next Steps Plan

This plan targets incremental improvements to the desktop shell (window manager, taskbar/navbar, whisker menu, settings, and theme system) while keeping feature integration stable.

## Focus areas

1. **Improve look and feel**
   - Tighten spacing, polish hover/pressed states, and ensure window chrome feels consistent across apps.
   - Validate theme tokens and keep shadows/borders consistent with `docs/TASKS_UI_POLISH.md`.

2. **Close feature gaps**
   - Address missing interactions (e.g., dock indicators, snap sizing, titlebar affordances) in small, focused slices.
   - Ensure desktop-shell improvements align with the existing roadmap and acceptance criteria.

3. **Reduce regressions**
   - Keep public APIs stable between Desktop → Window → App (props like `closeWindow`, `minimizeWindow`, `updateWindowSize`).
   - Avoid cross-cutting refactors until late in the sequence.

## Guardrails

- Work in small PR-sized slices: one feature or one refactor at a time.
- Keep public APIs stable between Desktop → Window → App until the end.
- Run project checks after each slice:
  - `yarn verify:all` (see `scripts/verify.mjs`).
  - `yarn smoke` and `yarn test` if they are wired in your environment.

## How to use this plan

- Pick one item from the UI polish roadmap or a specific desktop-shell gap.
- Implement the change in a single, focused PR.
- Record the checks you ran in the PR summary and include screenshots for UI-facing changes.
