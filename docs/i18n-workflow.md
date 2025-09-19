# Internationalization Workflow

This project uses a lightweight key-based translation system so that desktop UI strings can be
localized without touching every runtime bundle. Translation catalogs live under [`i18n/`](../i18n)
and are generated from the source code by the `scripts/i18n.mjs` CLI.

## Key extraction and catalogs

- Use the helper `t('namespace.key', 'Default English copy')` (or `<Trans i18nKey="namespace.key" defaultValue="Default" />`)
  when adding UI text. Keys **must** be static string literals.
- Run `yarn i18n sync` whenever you add, rename, or delete translation keys. The command:
  - scans the codebase for `t(...)` calls and `<Trans />` components listed in `i18n/config.json`.
  - merges the keys into `i18n/<locale>.json` runtime catalogs and the matching `.po` files.
  - prints any keys that are missing required-locale translations or were removed.
- Fill in translations inside the JSON catalog for each locale. The default locale (`en`) is required
  and must always have a non-empty translation. Optional locales (such as `fr`) can be filled over
  time; they will be reported as "pending" until complete.
- Commit both the `.json` and `.po` files. The PO catalog keeps translator-friendly metadata such as
  file references and default strings.

## Required checks

- `yarn i18n check` verifies that catalogs are up to date and that required locales do not contain
  missing strings. The CI pipeline runs this command and will fail if a new key is missing from
  `i18n/en.json` or if stale keys are still present.
- If `yarn i18n check` reports "catalogs are out of date", rerun `yarn i18n sync` and commit the
  regenerated files.

## Suggested workflow for new strings

1. Add UI copy using `t('feature.key', 'Readable default copy')` (or the `<Trans />` equivalent).
2. Run `yarn i18n sync` to extract keys.
3. Update `i18n/en.json` with the final English text and fill any other locales you maintain.
4. Review the generated `.po` files (optional) before committing.
5. Run `yarn i18n check` and your usual lint/test commands.

Following these steps keeps translation catalogs synchronized and prevents regressions from landing
in CI.
