# High contrast palette reference

This document records the contrast ratios for the colors that power the high-contrast theme and icon set. The values were measured with the WCAG 2.1 relative luminance formula so future assets can keep the same accessibility bar.

## Theme tokens

| Token | Hex | Contrast vs `#000` (background) | Contrast vs `#fff` (text) | Notes |
| --- | --- | --- | --- | --- |
| `--color-ub-orange`, `--game-color-secondary`, `--color-ubt-blue` | `#1A73E8` | 4.66 | 4.51 | Primary accent and link tone. Works with either white or near-black text. |
| `--color-ub-border-orange` | `#8AB4F8` | 9.96 | 2.11 | Border highlight; pair with dark surfaces for outlines. |
| `--color-ub-lite-abrgn`, `--color-ub-dark-grey` | `#1F2937` | 1.43 | 14.68 | Default window surface against the pure-black desktop. |
| `--game-color-success` | `#2DDC4B` | 11.45 | 1.83 | Success state, use with dark text when it becomes a fill. |
| `--game-color-warning` | `#FFB400` | 11.78 | 1.78 | Warning tone, reserve for icon fills or pair with black text. |
| `--game-color-danger` | `#FF375F` | 5.96 | 3.52 | Error/danger color. Meets the 3:1 AA requirement for UI indicators. |
| `--focus-outline-color` | `#FFD60A` | 14.88 | 1.41 | High-visibility focus ring; 3px thickness in the theme. |

All neutral tokens (`--color-ub-grey`, `--color-ub-cool-grey`, and `--color-bg`) sit at or near pure black so white text keeps a 21:1 contrast ratio. The shared surface tone at `#1F2937` ensures window content stays readable while still lifting off the desktop.

## Icon palette

The refreshed SVG icons in `public/icons/*/high-contrast.svg` use the same colors so the brand lockup passes WCAG checks on the black tile background:

- Border `#1A73E8` vs background `#000000`: 4.66:1
- Inner bar `#FFFFFF` vs background `#000000`: 21.00:1
- Accent wedge `#FFD60A` vs background `#000000`: 14.88:1
- Accent wedge `#2DDC4B` vs background `#000000`: 11.45:1

When creating future icons, stick to combinations that stay above 4.5:1 for small UI details and 3:1 for large fills, and keep the background pure black so the contrast ratios hold. Reuse the Python helper in `/docs` if you need to check new swatches:

```python
from math import pow

def srgb_to_linear(value: int) -> float:
    value /= 255
    if value <= 0.03928:
        return value / 12.92
    return pow((value + 0.055) / 1.055, 2.4)

def contrast(a: str, b: str) -> float:
    def luminance(color: str) -> float:
        color = color.lstrip('#')
        r = int(color[0:2], 16)
        g = int(color[2:4], 16)
        b = int(color[4:6], 16)
        return 0.2126 * srgb_to_linear(r) + 0.7152 * srgb_to_linear(g) + 0.0722 * srgb_to_linear(b)
    l1, l2 = luminance(a), luminance(b)
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)
```

Using these baseline numbers keeps interactive focus states and iconography legible in both manual high-contrast mode and the `prefers-contrast` media query.
