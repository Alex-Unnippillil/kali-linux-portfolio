# Icon Import Policy

We ship phosphor icons via per-file entry points to keep the vendor chunk small. Follow these rules when adding or updating icons:

- Import icons from `@phosphor-icons/react/dist/ssr/<IconName>` (or the `dist/csr` variant for purely client components) rather than the top-level package. Next.js is configured with `modularizeImports` to rewrite member imports automatically and drop unused icons during tree shaking.
- Bulk imports from `@phosphor-icons/react` (or any unsupported subpath) are blocked by the custom ESLint rule `no-top-level-window/enforce-phosphor-entrypoints`. Fix the lint error by swapping to a per-icon path.
- If a new icon library is introduced, add a similar `modularizeImports` mapping and extend the lint rule before landing the change.

These guardrails ensure we do not regress bundle size when expanding the UI.
