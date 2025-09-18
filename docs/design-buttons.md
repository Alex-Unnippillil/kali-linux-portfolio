# Button system

The desktop shell now exposes a shared button system that maps design tokens to reusable CSS
variants. Use these classes in place of ad-hoc Tailwind mixes so control states remain
consistent across apps.

## Tokens

The following custom properties are available globally (see `styles/tokens.css`). The base
`--control-*` tokens map to the neutral surface style while the suffixes switch colours and
shadows for emphasised actions.

- `--control-transition-duration`, `--control-transition-easing`, `--control-transform-active`
- `--control-surface*` – neutral surface background, border, text and shadow states
- `--control-primary*`, `--control-success*`, `--control-warning*`, `--control-danger*` – accent
  palettes for major CTAs, success/confirmation, warning and destructive actions
- `--control-ghost*` – transparent background controls for toolbars or secondary actions
- `--control-disabled-*` – muted palette for disabled controls

Each group includes `surface`, `hover`, `active`, `border`, `foreground`, `shadow` and focus ring
values. High contrast, reduced motion and media query overrides are wired up so the same token
names work across accessibility modes.

## Classes

Buttons use a `.btn` base class with optional modifiers. The base class wires up padding,
minimum hit area, font weight, transitions and disabled handling. Variants override the
custom properties exposed above:

- `.btn--primary`, `.btn--success`, `.btn--warning`, `.btn--danger` – map to the accent tokens
- `.btn--ghost` – transparent chrome, toggles to the active colours when `.is-active`,
  `aria-pressed="true"` or `aria-current="page"`
- `.btn--dense` – reduced vertical padding for tight layouts
- `.btn--icon` – circular icon buttons that maintain the minimum hit area
- `.btn--toolbar` – ghost treatment tuned for the top navigation with inset focus/active bars

The system also sets shared focus rings through `--control-ring-*` tokens so buttons and other
controls reuse the same feedback. Apply the `.btn` class to `<button>`, `<a>`, or semantic
controls with `role="button"` as needed.

## Reference gallery

Visit `/ui/button-gallery` to preview the current variants. The Playwright spec
`tests/button-visual.spec.ts` captures a screenshot of this gallery to guard against regression.

When adding a new variant, extend the token set in `styles/tokens.css`, add a modifier under the
`@layer components` block in `styles/tailwind.css`, update this document, and include an example
in the gallery page.
