# Design System

## Spacing tokens

Spacing is standardized on a 4&nbsp;px rhythm. The source of truth lives in
[`styles/tokens.css`](../styles/tokens.css) and mirrors to the Tailwind spacing
scale in [`tailwind.config.js`](../tailwind.config.js). Tokens are named
`--space-0` through `--space-32` and resolve to multiples of `0.25rem` (4&nbsp;px).

Use these tokens through Tailwind utility classes rather than hard‑coding pixel
values. Every token is exposed to Tailwind with the `space-*` prefix. Examples:

- `px-space-3` → horizontal padding of 12&nbsp;px
- `py-space-1` → vertical padding of 4&nbsp;px
- `gap-space-6` → flex/grid gap of 24&nbsp;px
- `bottom-space-4` / `right-space-4` → positioned offsets of 16&nbsp;px

If you need a new size, add it to both the CSS token file and the Tailwind
spacing map so utilities stay in sync.

## Layout & grid review checklist

Run this checklist for any new layout, container, or overlay component. It keeps
UI aligned with the 12‑column grid utilities described in
[`docs/internal-layouts.md`](./internal-layouts.md).

- [ ] Spacing utilities (`p-*`, `m-*`, `gap-*`, positional offsets) use
      `space-*` tokens. No raw numbers or ad-hoc `px` values.
- [ ] Components align to the internal 12‑column grid helpers when creating
      multi-column layouts (`col-*`/`offset-*`).
- [ ] Windowed overlays and floating CTAs anchor to token-based offsets so they
      snap to the 4&nbsp;px rhythm on different viewports.
- [ ] Screens include responsive checks—verify the layout against desktop,
      tablet, and narrow breakpoints defined in the Tailwind config.
- [ ] Add regression tests or stories when layout changes affect user flows
      (e.g., focus order, keyboard navigation, or dock/window placement).

Document the checklist status in PR descriptions or design review notes so
spacing and grid regressions are caught early.
