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

## Component States

Use consistent state styles across interactive elements to provide predictable feedback.
The shared `stateStyles` utility adds transitions, focus outlines and respects reduced motion preferences.

### Buttons

`<Button>` already includes `stateStyles`. States:

- **Hover:** lightens the background.
- **Active:** further lightens and slightly scales down.
- **Focus:** 2px outline using `--focus-outline-color`.
- **Disabled:** native disabled behaviour.

### Links

Apply the utility to anchors for the same focus and transition behaviour:

```html
<a class="transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" href="#">Link</a>
```

### Inputs

Inputs receive the shared focus outline. Add transition classes for hover effects:

```html
<input class="border px-2 py-1 transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" />
```

### Chips

`<CommandChip>` uses `stateStyles` and darkens on hover and active states while showing the outline on focus.

### Tabs

Tab buttons import `stateStyles` so hover, active and focus treatments match buttons:

```tsx
<Tabs tabs={[{ id: 'a', label: 'A' }]} active="a" onChange={() => {}} />
```

### Reduced Motion

Transitions include a fallback for users who prefer reduced motion via the `motion-reduce` variant:

```html
<button class="transition-colors motion-reduce:transition-none">Save</button>
```

When `prefers-reduced-motion` is enabled, the transition is removed.
