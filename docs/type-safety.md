# Type Safety Notes

## skipLibCheck

- `skipLibCheck` is now disabled in `tsconfig.json`. Third-party declaration issues were resolved by adding targeted overrides in `types/overrides/` for:
  - `idb` (`types/overrides/idb.d.ts`)
  - `3d-force-graph` (`types/overrides/3d-force-graph.d.ts`)
  - `three-forcegraph` (`types/overrides/three-forcegraph.d.ts`)
  - `react-force-graph` (`types/overrides/react-force-graph.d.ts`)
- Additional ambient declarations in `types/dom-augmentations.d.ts` and `types/cytoscape-compat.d.ts` patch missing DOM and library symbols exposed by the stricter check.

## allowJs

- Disabling `allowJs` currently fails because many TypeScript entry points import legacy `.js` modules. A trial run (`allowJs=false`) produces 48 unresolved module errors across `components/apps/*`, game hooks, and pages that depend on JavaScript-only implementations.【96fae7†L1-L86】
- Migrating those modules requires a larger refactor: either porting major sections of `components/apps` to TypeScript or authoring per-module declaration files. That scope exceeds this change.
- Until that migration is planned, `allowJs` remains `true`. The new override declarations ensure strict checking for existing TypeScript while documenting the remaining JavaScript surface.

## Operational checklist

- Run `yarn typecheck` (enabled by the stricter configuration) before commits.
- Any future JavaScript-to-TypeScript migrations should add explicit typings so `allowJs` can eventually be disabled.
