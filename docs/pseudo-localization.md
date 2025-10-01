# Pseudo Localization QA Checklist

The desktop shell now ships with a built-in pseudo locale that expands UI copy so visual
regressions are easier to spot. Follow the steps below when running manual sweeps.

## Enabling the mode

1. Launch the **Settings** app from the dock or whisker menu.
2. Scroll to the **developer** section and toggle **Pseudo Localization (dev)**.
   * The window should display an informational banner confirming the mode is active.
   * All visible strings will grow by roughly 30% and gain accent marks and bracket guards.
3. Confirm the `<html>` element reflects the `qps-ploc` pseudo locale (`lang="qps-ploc"`).

The same toggle is persisted in IndexedDB/localStorage, so the desktop will remember your
preference across reloads. To force the mode during builds, set `NEXT_PUBLIC_PSEUDO_LOCALE=true`.

## What to verify

* **Overflow detection** – review the app grid, whisker menu categories, window chrome, and
  at least one detail page (e.g., Projects) to ensure text expansion does not clip or overlap.
* **Tooltips and dialogs** – open a few tooltips and context menus to confirm the pseudo strings
  remain readable and controls stay aligned.
* **Search inputs** – check placeholder text in the whisker search, the global app search page,
  and developer tooling forms. Placeholders should also receive pseudo localization.
* **Reset behaviour** – disable the toggle and verify the banner disappears, the `lang`
  attribute returns to `en`, and UI copy reverts immediately without requiring a refresh.

Document any layout breaks you encounter so the owning feature team can triage.
