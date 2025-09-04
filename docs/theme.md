# Theme Tokens

Design tokens centralize color, spacing, radius, and shadow values for the UI. All tokens are defined in [`styles/tokens.css`](../styles/tokens.css) and consumed by Tailwind via CSS variables.

## Colors
| Token | Value |
|-------|-------|
| `--color-ub-grey` | `#0f1317` |
| `--color-ub-warm-grey` | `#7d7f83` |
| `--color-ub-cool-grey` | `#1a1f26` |
| `--color-ub-orange` | `#1793d1` |
| `--color-ub-lite-abrgn` | `#22262c` |
| `--color-ub-med-abrgn` | `#1b1f24` |
| `--color-ub-drk-abrgn` | `#13171b` |
| `--color-ub-window-title` | `#0c0f12` |
| `--color-ub-gedit-dark` | `#021B33` |
| `--color-ub-gedit-light` | `#003B70` |
| `--color-ub-gedit-darker` | `#010D1A` |
| `--color-ubt-grey` | `#F6F6F5` |
| `--color-ubt-warm-grey` | `#AEA79F` |
| `--color-ubt-cool-grey` | `#333333` |
| `--color-ubt-blue` | `#62A0EA` |
| `--color-ubt-green` | `#73D216` |
| `--color-ubt-gedit-orange` | `#F39A21` |
| `--color-ubt-gedit-blue` | `#50B6C6` |
| `--color-ubt-gedit-dark` | `#003B70` |
| `--color-ub-border-orange` | `#1793d1` |
| `--color-ub-dark-grey` | `#2a2e36` |
| `--color-bg` | `#0f1317` |
| `--color-text` | `#F5F5F5` |
| `--color-info` | `#0ea5e9` |
| `--color-hc-text` | `#000000` |
| `--color-hc-bg` | `#ffffff` |
| `--color-highlight` | `#fbbf24` |
| `--color-focus-ring` | `#3B82F6` |

## Spacing
| Token | Value |
|-------|-------|
| `--space-px` | `1px` |
| `--space-0-5` | `2px` |
| `--space-1` | `0.25rem` |
| `--space-1-25` | `0.3125rem` |
| `--space-1-5` | `0.375rem` |
| `--space-2` | `0.5rem` |
| `--space-2-5` | `0.625rem` |
| `--space-3` | `0.75rem` |
| `--space-4` | `1rem` |
| `--space-5` | `1.5rem` |
| `--space-6` | `2rem` |

## Radius
| Token | Value |
|-------|-------|
| `--radius-sm` | `2px` |
| `--radius-md` | `4px` |
| `--radius-lg` | `8px` |
| `--radius-round` | `9999px` |
| `--radius-full` | `50%` |
| `--radius-scroll` | `5px` |

## Shadows
| Token | Value |
|-------|-------|
| `--shadow-window` | `1px 4px 12px 4px rgba(0, 0, 0, 0.2)` |
| `--shadow-crt` | `0 0 10px rgba(0, 255, 0, 0.5)` |

These tokens provide a single source of truth for theming and can be extended as the design system evolves.
