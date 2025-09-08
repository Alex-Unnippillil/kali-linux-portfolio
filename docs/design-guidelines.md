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
