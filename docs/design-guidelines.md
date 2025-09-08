# Design Guidelines

## Spacing Tokens

Use the `space-*` scale to maintain an 8px rhythm across breakpoints. The tokens are available in Tailwind as margin, padding, gap and positional utilities (`p-space-2`, `mt-space-1`, etc.).

| Token | Value |
|-------|-------|
| `space-0` | 0px |
| `space-1` | 8px |
| `space-2` | 16px |
| `space-3` | 24px |
| `space-4` | 32px |
| `space-5` | 40px |
| `space-6` | 48px |
| `space-7` | 56px |
| `space-8` | 64px |

Example:

```html
<section class="p-space-2 md:p-space-3">
  <!-- content -->
</section>
```

These tokens ensure that layouts snap to the 8px grid at all breakpoints.

## Radii Tokens

Use the `radius-*` scale to apply consistent rounding across components. These tokens are available in Tailwind via the standard `rounded` utilities (`rounded-md`, `rounded-lg`, etc.).

| Token | Value |
|-------|-------|
| `radius-none` | 0 |
| `radius-sm` | 2px |
| `radius-md` | 4px |
| `radius-lg` | 8px |
| `radius-xl` | 16px |
| `radius-round` | 9999px |

Example:

```html
<button class="px-space-2 py-space-1 rounded-md">Save</button>
```

Buttons and inputs use `radius-md`, while larger surfaces like cards, panels and windows use `radius-lg`.
