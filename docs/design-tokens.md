# Design Tokens

This project now exposes a formal token system that keeps the Kali desktop look-and-feel consistent across CSS, Tailwind, and JavaScript.

## Token sources

The canonical map lives in [`styles/tokens.css`](../styles/tokens.css). Tokens are grouped into:

- **Foundations** – base palette, spacing scale, radii, shadow recipes, and motion curves.
- **Semantic aliases** – surface, text, status, brand, border, and overlay tokens built from the foundations.
- **Legacy aliases** – backwards-compatible variables that keep older components working while they are migrated.

## Tailwind integration

`tailwind.config.js` maps token variables into the design system utilities:

- Colors: `bg-surface-panel`, `text-text-primary`, `border-status-warning`, etc.
- Spacing: `p-lg`, `gap-sm`, `space-y-xs`, and more, driven by the shared spacing scale.
- Radii & shadows: `rounded-lg`, `shadow-md`, `shadow-terminal` now resolve to CSS variables.
- Motion: `duration-fast`, `duration-entrance`, `ease-emphasized` read from the motion tokens.

Use these semantic utilities instead of raw hex codes or arbitrary values. They automatically respond to accessibility modes (high contrast, dyslexia, reduced motion) because those modes only need to override the token values.

## JavaScript helpers

[`lib/designTokens.ts`](../lib/designTokens.ts) exposes strongly typed helpers:

```ts
import { tokenVar, getTokenValue, listDesignTokens } from '../lib/designTokens';

// CSS variable string for inline styles
const scrimVar = tokenVar('overlay', 'scrim');

// Resolve a computed value (with SSR-safe fallback)
const focusColor = getTokenValue('border', 'focus');

// Introspect available tokens
const radiusKeys = listDesignTokens('radius');
```

Use `tokenVar` when you can rely on CSS variables (e.g. inline `style` props, chart libraries that accept CSS colors). Use `getTokenValue` when you need an actual color string during SSR or for third-party APIs that do not understand CSS variables.

## Authoring guidelines

1. Prefer semantic tokens (e.g. `text-text-secondary` or `bg-surface-elevated`) over foundation tokens (`--color-neutral-800`) for maintainability.
2. When creating new utilities or components, avoid hard-coded values. If a visual affordance feels unique, add a token first.
3. Respect accessibility variants: high contrast, reduced motion, dyslexia-friendly fonts, and large hit areas are implemented through token overrides.
4. If you need a new token, update `styles/tokens.css`, add TypeScript metadata in `lib/designTokens.ts`, and extend Tailwind if a utility is required.
5. Reference this document in code reviews so contributors keep building on the shared vocabulary.

## Migration plan

- Legacy variables (`--color-ub-*`, `--color-bg`, etc.) are still present but will be removed in a later cleanup once remaining call-sites adopt the semantic tokens.
- Games and legacy simulations can migrate gradually. Start with shared UI and control surfaces first.

By keeping styles anchored to the token map we can adjust theming, high-contrast palettes, and animation policies without chasing individual components.
