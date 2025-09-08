# TypeScript strict mode migration

The project now opts into stronger type safety via `strict`,
`noUncheckedIndexedAccess`, and `noImplicitOverride` in `tsconfig.json`.
Key components such as `VirtualControls` are migrated to TypeScript, and
window manager state updates use a discriminated union of actions.

These changes surface previously unchecked scenarios like accessing missing
array entries or overriding methods unintentionally. Most issues were resolved
by adding explicit types or guards.

A new `persistentStorage` utility provides validated localStorage access to
avoid corrupt data.
