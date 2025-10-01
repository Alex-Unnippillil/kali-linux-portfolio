# Design System Handbook

## Elevation system

The portfolio now exposes a layered elevation scale in `styles/elevation.css`. Six levels balance depth cues with WCAG contrast
for light text on the dark Kali palette and adapt automatically to theme overrides.

| Level | Shadow token | Surface mix (approx. color) |
| ----- | ------------- | -------------------------- |
| 1 | `--elevation-shadow-1` | `color-mix(var(--color-surface) 94%, var(--color-text) 6%)` (≈ `#1a1f26`) |
| 2 | `--elevation-shadow-2` | `color-mix(var(--color-surface) 90%, var(--color-text) 10%)` (≈ `#202833`) |
| 3 | `--elevation-shadow-3` | `color-mix(var(--color-surface) 86%, var(--color-text) 14%)` (≈ `#24313d`) |
| 4 | `--elevation-shadow-4` | `color-mix(var(--color-surface) 82%, var(--color-text) 18%)` (≈ `#263441`) |
| 5 | `--elevation-shadow-5` | `color-mix(var(--color-surface) 78%, var(--color-text) 22%)` (≈ `#2a3948`) |
| 6 | `--elevation-shadow-6` | `color-mix(var(--color-surface) 74%, var(--color-text) 26%)` (≈ `#2e3f50`) |

### Usage guidelines

- **Context menus and overlays** use level 3 by default (`.context-menu-bg`). Windows use level 5 through `components/base/window.module.css`.
- Utilities such as `.elevation-layer-{n}`, `.elevation-shadow-{n}`, `.elevation-surface-{n}`, and `.elevation-transition` are available for
  React components that need to opt into elevation without writing bespoke CSS.
- Glassmorphism helpers (for example `.glass` in `styles/tailwind.css`) pull from level 4 to keep translucency readable against wallpapers.
- Background colors were tuned to keep contrast ratios above 9:1 against the base text color so content remains legible.

### Motion and accessibility

The elevation tokens respond to system preferences and the `.reduced-motion` utility:

- `prefers-reduced-motion: reduce` swaps animated shadows for static outline variants and collapses the shared transition timing to `0.01ms`.
- Applying `.reduced-motion` to a subtree mirrors that behavior for user toggles inside the desktop.

### Lint guard

Custom `box-shadow` declarations inside JSX are restricted. Use the tokens above (for example `boxShadow: 'var(--elevation-shadow-3)'`) instead
of ad-hoc values. The ESLint rule lives in `eslint.config.mjs` and fails builds when literals are used.
