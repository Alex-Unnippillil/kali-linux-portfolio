# Theme implementation guidelines

The desktop UI relies on a shared token system so designers and developers can ship
features without duplicating color or motion values. The tokens live in
[`styles/tokens.css`](../styles/tokens.css) and are surfaced globally through
`styles/globals.css` and `styles/index.css`.

## Available theme variants

| Token | Description |
| --- | --- |
| `default` | Kali-inspired default surface palette. |
| `dark` | Ultra-dark variant for AMOLED displays. |
| `neon` | High-saturation aesthetic with magenta accents. |
| `matrix` | Green-on-black retro terminal palette. |
| `high-contrast` | Accessibility-first palette with yellow accents, WCAG AA+ compliant. |

Each theme is expressed as a `data-theme` attribute on `<html>`. Utility helpers
in `utils/theme.ts` and `public/theme.js` synchronise that attribute and toggle
the `dark` / `high-contrast` classes so Tailwind utilities and legacy selectors
stay in sync. To avoid flashes of unstyled content (FOUC), always invoke
`setTheme` (or `useSettings().setTheme`) which updates the DOM before touching
`localStorage`.

When the high-contrast toggle is active the previous theme is cached so the
system can restore the user’s choice once the override is disabled.

## Color tokens

Use CSS variables rather than hard-coded values:

```css
.button {
  background: var(--color-accent);
  color: var(--color-inverse);
}
```

Accent customisation is handled centrally via `useSettings`, so components should
not mutate accent variables directly.

## Motion tokens

Animations and transitions must reference the motion tokens (`--motion-fast`,
`--motion-medium`, `--motion-slow`). Reduced motion preference caps all three at
`100ms` and disables non-essential transitions. For manual animations in JavaScript
check `usePrefersReducedMotion()` before scheduling long-running effects.

```css
.tile-pop {
  animation: tile-pop var(--motion-fast) ease-out;
}
```

## Testing checklist

* Verify new components read their palette from CSS variables.
* Confirm reduced motion settings keep animations at or below 100 ms.
* Exercise the Settings app to ensure theme and high-contrast options round-trip
  via `SettingsProvider`.
