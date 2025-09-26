# Design token guide

This project defines a unified set of design tokens that can be consumed from both CSS and JavaScript / TypeScript.
Tokens live in [`styles/tokens.css`](../styles/tokens.css) as CSS custom properties and are exported in a typed
structure under [`tokens/`](../tokens/index.ts). The Tailwind theme consumes the same token map so that utility classes
remain in sync with runtime styles.

## Token categories

| Category | Source | Tailwind usage |
| --- | --- | --- |
| Colors | `tokens.colors` | `bg-kali-primary`, `text-kali-muted`, `ring-kali-accent` |
| Spacing | `tokens.spacing` | `p-space-2`, `mt-space-4`, `gap-space-1-5` |
| Radii | `tokens.radii` | `rounded-control`, `rounded-panel`, `rounded-pill` |
| Shadows | `tokens.shadows.box`, `tokens.shadows.drop` | `shadow-panel`, `shadow-card`, `drop-shadow-glow` |
| Z levels | `tokens.zIndex` | `z-underlay`, `z-modal`, `z-popover` |

> The `tokens` module exports deep-frozen objects so the design system cannot be mutated accidentally at runtime.

## Authoring guidelines

1. Prefer the token-backed Tailwind utilities (`p-space-2`, `rounded-panel`, `shadow-card`, etc.) instead of hard-coded
   numeric or color values.
2. When adding a new visual primitive, define the CSS custom property in `styles/tokens.css`, add it to
   `tokens/design-tokens.json`, and re-export it through `tokens/index.ts`. Tailwind picks it up automatically.
3. For runtime logic or tests that need token values, import from `tokens/index.ts` instead of duplicating constants.
4. If a component needs a value between tokens, first evaluate whether a new token should be introduced to keep spacing
   consistent across the desktop shell.

## Testing and linting

A lightweight unit test (`__tests__/design-tokens.test.ts`) verifies that the exported tokens match the expected CSS
custom property structure. Run the standard quality gates to validate changes:

```bash
yarn lint
yarn test
```
