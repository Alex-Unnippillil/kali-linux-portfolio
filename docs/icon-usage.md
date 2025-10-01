# Icon usage and high-contrast variants

The brand icon is available as outline and filled variants under `/public/icons`. Each
variant is exported at 48, 64, 128, and 256px sizes for PWA manifests and other
platform integrations.

## File map

| Variant | Default path | Size-specific paths |
| --- | --- | --- |
| Outline | `/icons/brand-outline.svg` | `/icons/48/brand-outline.svg`, `/icons/64/brand-outline.svg`, `/icons/128/brand-outline.svg`, `/icons/256/brand-outline.svg` |
| Filled | `/icons/brand-filled.svg` | `/icons/48/brand-filled.svg`, `/icons/64/brand-filled.svg`, `/icons/128/brand-filled.svg`, `/icons/256/brand-filled.svg` |

The outline asset is the default icon for the application shell. When high-contrast
mode is enabled the filled variant is applied automatically via the settings hook so
that the glyph maintains a minimum 7:1 contrast ratio against the background.

## Theme variables

Icon colors are controlled through CSS custom properties defined in
`styles/tokens.css`:

- `--icon-container`
- `--icon-outline`
- `--icon-symbol`
- `--icon-symbol-strong`
- `--icon-fill`

The default palette keeps parity with the Kali blue brand while the `.high-contrast`
class and `prefers-contrast: more` media query override each variable with a WCAG AAA
contrast combination.

## Consuming icons in code

- HTML metadata: use the `<link rel="icon" type="image/svg+xml" ...>` entries in
  `_document.jsx` and `components/SEO/Meta.js`. The settings hook swaps outline vs.
  filled variants at runtime.
- Status checks and similar utilities should point to `/icons/brand-outline.svg`
  instead of legacy `favicon.ico` to ensure the accessibility palette is exercised.
- For static exports or documentation you can link to the size-specific files above.

When introducing additional icons, follow the same variable names so they respond to
high-contrast toggles without additional logic.
