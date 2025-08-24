# Layering and Pointer Events

This project uses a small set of z-index tokens to keep overlay layers predictable.

| Token | Value | Purpose |
|-------|-------|---------|
| `z-overlay` | `50` | general full-screen overlays such as the all applications view |
| `z-menu` | `60` | contextual menus above normal overlays |
| `z-lock` | `100` | lock screen displayed above everything |

Components that can be hidden should use the `pointer-events-none` / `pointer-events-auto` pattern so that hidden layers do not block interaction with the desktop:

```jsx
<div className={isOpen ? 'block pointer-events-auto' : 'hidden pointer-events-none'}>
  ...
</div>
```

`pointer-events-none` is also useful on wrapper elements while children use `pointer-events-auto` to limit click areas.

