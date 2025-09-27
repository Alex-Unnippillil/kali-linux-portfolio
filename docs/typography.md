# Typography guide

The desktop UI shares a responsive type scale that uses `clamp()` so text can flex between
smaller laptop viewports and large displays without needing per-breakpoint overrides. The
scale is defined once in CSS custom properties and reused by Tailwind so the semantic
utility classes automatically map to the design tokens.

## Type scale

| Token | Clamp value | Typical usage |
| --- | --- | --- |
| `--font-size-body-xs` | `clamp(0.8125rem, 0.78rem + 0.2vw, 0.9375rem)` | fine print, captions |
| `--font-size-body-sm` | `clamp(0.875rem, 0.84rem + 0.22vw, 1rem)` | standard body copy |
| `--font-size-body-md` | `clamp(1rem, 0.96rem + 0.25vw, 1.125rem)` | lead paragraphs |
| `--font-size-body-lg` | `clamp(1.125rem, 1.07rem + 0.32vw, 1.25rem)` | emphasized body text |
| `--font-size-heading-xs` | `clamp(1.25rem, 1.17rem + 0.35vw, 1.5rem)` | h5, sidebar titles |
| `--font-size-heading-sm` | `clamp(1.5rem, 1.4rem + 0.45vw, 1.8rem)` | h4, app section titles |
| `--font-size-heading-md` | `clamp(1.875rem, 1.72rem + 0.6vw, 2.25rem)` | h3, dialog headers |
| `--font-size-heading-lg` | `clamp(2.25rem, 2.05rem + 0.75vw, 2.75rem)` | h2, hero copy |
| `--font-size-display-sm` | `clamp(2.75rem, 2.45rem + 1vw, 3.5rem)` | h1, app chrome |
| `--font-size-display-md` | `clamp(3.25rem, 2.85rem + 1.2vw, 4rem)` | desktop banners |
| `--font-size-display-lg` | `clamp(3.75rem, 3.25rem + 1.4vw, 4.5rem)` | large hero typography |
| `--font-size-mono-sm` | `clamp(0.8125rem, 0.79rem + 0.15vw, 0.9375rem)` | inline code |
| `--font-size-mono-md` | `clamp(0.9375rem, 0.9rem + 0.18vw, 1.0625rem)` | terminal output |
| `--font-size-mono-lg` | `clamp(1.0625rem, 1.02rem + 0.22vw, 1.1875rem)` | large meter displays |

The base sans-serif stack is exposed as `--font-family-base` while monospace UI uses
`--font-family-mono`. Line-height tokens are:

- `--line-height-tight` (`1.15`) for display copy.
- `--line-height-snug` (`1.25`) for headings.
- `--line-height-standard` (`1.5`) for paragraphs and lists.
- `--line-height-relaxed` (`1.7`) for long-form reading.
- `--line-height-mono` (`1.45`) for terminal and data views.

Use the spacing helpers when stacking text blocks: `--type-stack-sm`, `--type-stack-md`,
and `--type-stack-lg` already react to viewport width and keep vertical rhythm consistent.

## Tailwind mapping

`tailwind.config.js` wires these tokens into `text-*` utilities so existing class names
pick up the responsive scale automatically. Examples:

- `text-base` → `--font-size-body-md`
- `text-xl` → `--font-size-heading-xs`
- `text-4xl` → `--font-size-heading-lg`
- `text-7xl` → `--font-size-display-lg`

`font-sans` and `font-mono` also resolve to the CSS variables, ensuring user preference
and accessibility settings can override the stacks in one place.

## Authoring tips

1. Prefer Tailwind utilities for everyday sizing. Reach for the custom properties only
   when writing standalone CSS or when a component needs a bespoke clamp.
2. Pair `leading-tight`, `leading-snug`, `leading-normal`, or `leading-relaxed` with the
   appropriate text utility to stay inside the rhythm.
3. Use `leading-mono` on terminal-style widgets or tables that use `font-mono` so digits
   align neatly.
4. When creating stacked layouts, apply `space-y-*` classes or set `margin-block-end`
   to one of the `--type-stack-*` tokens to match the default flow spacing defined in
   `styles/index.css`.
