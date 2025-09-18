# Design system tokens

The Kali Linux portfolio now centralises its visual language in [`styles/tokens.json`](../styles/tokens.json). The JSON schema mirrors the major primitives the desktop shell relies on and is hydrated at build time by the Tailwind configuration. Every token becomes both a CSS custom property (for raw styles) and a Tailwind utility (for authoring speed).

## Token catalogue

### Colors

* `--color-background`, `--color-background-raised`, `--color-surface`, `--color-surface-muted`, `--color-surface-hover` – layered navies used for wallpaper overlays, windows, and hover states.
* `--color-chrome`, `--color-chrome-muted`, `--color-chrome-active` – window chrome, navbar, and focused title bars.
* `--color-border-subtle`, `--color-border-strong`, `--color-border-accent` – thin separators through bold accents (e.g. folder prompt buttons).
* `--color-accent-primary`, `--color-accent-secondary`, `--color-accent-glow` – Kali blue range, automatically re-tinted from the Settings accent picker.
* `--color-success`, `--color-warning`, `--color-danger`, `--color-terminal` – status colours reused by games and terminal skins.
* `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-text-inverted` – typography layers for readable dark UI.

Each colour token emits three variables (`--color-*-hex`, `--color-*-rgb`, `--color-*-solid`) so Tailwind can honour opacity modifiers such as `bg-kali-surface/70`.

### Spacing

Spacing steps live at `--space-3xs` through `--space-3xl` and power utilities like `p-2xs`, `gap-sm`, and `py-lg`. The density preference in Settings scales the same custom properties down using the new helper in `hooks/useSettings.tsx`.

### Radii and shadows

* Radius tokens (`--radius-xs` … `--radius-xl`, `--radius-pill`) feed into `rounded-lg`, `rounded-xl`, and the bespoke `rounded-pill` utility.
* Shadows (`--shadow-window`, `--shadow-focus`, `--shadow-popover`, `--shadow-glow`) are exposed as Tailwind utilities (`shadow-window`, `shadow-focus`, …) for consistent elevation.

### Typography & motion

* Families: `--font-family-sans` (`font-sans`, `font-ubuntu`), `--font-family-mono` (`font-mono`).
* Scale: `text-xs` through `text-4xl` now resolve to token sizes with matching line heights.
* Motion and misc: `--motion-fast`, `--motion-medium`, `--motion-slow`, and `--hit-area` (used by focus-visible styles and the large-hit-area accessibility toggle).

## Theme and accessibility modes

The token plugin writes overrides for:

* `html[data-theme='dark']`, `html[data-theme='neon']`, and `html[data-theme='matrix']` – palettes used by the theme switcher.
* `.high-contrast`, `.dyslexia`, `.large-hit-area`, `.reduced-motion` – settings toggles mapped to high contrast colour swaps, accessible fonts, bigger targets, and zeroed motion.
* A reduced-motion media query keeps animation tokens at `0ms` when the OS preference is set.

Legacy `ub-*` custom properties remain as aliases to the new Kali tokens to avoid breaking older components, but new work should prefer the `kali-*` utilities.

## Tailwind usage examples

Because tokens are registered as Tailwind colours, spacing and shadows, you can author components directly with utilities:

```jsx
<div className="bg-kali-surface text-kali-text-primary rounded-xl shadow-window p-lg">
  <h2 className="text-xl font-semibold text-kali-text-primary">Launcher</h2>
  <p className="text-sm text-kali-text-secondary">Pinned tools at a glance.</p>
  <button className="mt-sm px-md py-2xs rounded-lg bg-kali-accent-primary text-kali-text-inverted hover:bg-kali-accent-secondary">
    Open terminal
  </button>
</div>
```

See the updated shells for live references:

* `components/base/ubuntu_app.js` – application tiles use `p-2xs`, `hover:bg-kali-surface/30`, and the new accent ring utilities.
* `components/base/window.js` – the chrome adopts `bg-kali-chrome`, `text-kali-text-primary`, and `bg-kali-surface-muted` for its content panes.
* `components/screen/window-switcher.js`, `components/screen/all-applications.js`, `components/screen/navbar.js`, `components/screen/desktop.js` – overlays now rely on `bg-kali-background/80`, `shadow-kali-window`, and tokenised borders.

## Using tokens in CSS modules

All tokens are available as CSS variables. Example:

```css
.window-card {
  background: var(--color-surface-solid);
  color: var(--color-text-primary-solid);
  border: 1px solid color-mix(in srgb, var(--color-border-subtle-solid) 60%, transparent);
  box-shadow: var(--shadow-window);
}
.window-card button:focus-visible {
  outline: var(--focus-outline-width) solid var(--focus-outline-color);
  outline-offset: var(--focus-outline-offset);
}
```

When writing plain CSS (e.g. `styles/index.css`) prefer the `*-solid` helpers so the browser resolves the RGB function automatically.

## Runtime adjustments

* **Accent picker** – `hooks/useSettings.tsx` now updates `--color-accent-primary`, `--color-border-accent`, and friends, meaning every Tailwind utility that references the accent (selection colour, focus rings, CTA fills) adapts immediately.
* **Density** – the same provider scales `--space-*` variables and the alias values (`--space-1` … `--space-6`) to keep legacy components in sync.
* **High contrast / dyslexia / motion** – toggling these settings simply toggles the relevant class on the `<html>` element, and the token plugin restyles the experience.

## Migration notes

* New work should use `kali-*` Tailwind utilities (`bg-kali-surface`, `text-kali-text-secondary`, `shadow-kali-window`, etc.).
* Legacy `ub-*` utilities resolve to the new variables for backwards compatibility, but they no longer need to be added to new components.
* Use `var(--color-…)` directly when you need fine control over gradients or canvas drawing.
* For glassmorphism panels, combine `bg-kali-background/70` with `backdrop-blur` and `border-kali-border-subtle/40`.

By routing everything through the token map, the Kali desktop keeps a single source of truth for colour, type, and rhythm, and future theme work (light mode, experimental palettes) only needs JSON edits.
