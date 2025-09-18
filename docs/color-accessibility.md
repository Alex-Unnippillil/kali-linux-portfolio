# Status Color Accessibility

This document records the status palette, iconography, and validation workflow for badges, alerts, and other status-driven UI ele
ments.

## Palette tokens

The tokens live in `styles/tokens.css` and expose a color-blind friendly set based on the Okabe–Ito palette. Each tone has a bas
 e hue, an accent used for stripes/borders, and a contrast color for text.

| Tone     | Base token            | Accent token              | Contrast token              | Hex values |
|----------|----------------------|---------------------------|-----------------------------|------------|
| Info     | `--status-info`      | `--status-info-strong`    | `--status-info-contrast`    | `#0072B2`, `#004B7C`, `#F2F8FF` |
| Success  | `--status-success`   | `--status-success-strong` | `--status-success-contrast` | `#007F5F`, `#005D44`, `#F5FDF8` |
| Warning  | `--status-warning`   | `--status-warning-strong` | `--status-warning-contrast` | `#E69F00`, `#B87400`, `#1A1200` |
| Danger   | `--status-danger`    | `--status-danger-strong`  | `--status-danger-contrast`  | `#D55E00`, `#953F00`, `#1A0A00` |
| Neutral  | `--status-neutral`   | `--status-neutral-strong` | `--status-neutral-contrast` | `#7F7F7F`, `#5A5A5A`, `#111111` |

The same tones drive the Tailwind aliases (`--color-ubt-green`, `--color-ubt-blue`, etc.) so inline utility classes stay in sync
 with the new hues.

## Usage patterns

- `.status-badge` supplies icon + text badges with diagonal stripe patterns. Apply using the `<StatusBadge />` component for con
  sistent semantics and tone inference.
- `.alert-banner` powers system alerts (warnings, errors, etc.) via the `<AlertBanner />` component. Content flows in a flex cont
  ainer so text, buttons, and titles align cleanly.
- SVG timelines such as the OpenVAS task chart use tone-driven markers with unique shapes (triangle, square, circle, diamond) an
  d pattern fills to differentiate state without relying solely on color.

These cues ensure color-only differences are backed by iconography, text labels, and texture.

## Validation workflow

Run the automated palette check after adjusting tokens:

```bash
node scripts/validate-status-colors.mjs
```

The script simulates protanopia, deuteranopia, and tritanopia using matrix transforms, then prints contrast ratios between each 
status color and its companion contrast token. Use the output to confirm ratios ≥ 4.5:1 for body text and that simulated colors 
still remain distinct.

For manual review, Chrome DevTools (Rendering → Emulate vision deficiencies) or the Stark Figma plugin can be used to cross-che
ck the UI. Focus on:

1. Task status chips (`<StatusBadge />`).
2. Alert banners in simulator, ExternalFrame, and form validation flows.
3. SVG charts that formerly relied on color-only dots.

Document findings alongside screenshots in pull requests when introducing new tones.
