# Button Variant System

The shared UI buttons now live under `components/ui` and centralize hover, focus, and disabled states across the desktop shell. Use these React components instead of hand-rolled `<button>` or `<a>` styles:

- `Button` — semantic button element with theme-aware variants.
- `LinkButton` — Next.js `Link` wrapper that reuses the same visual system for navigation links.

## Variants

All variants include a consistent focus ring (`focus-visible:ring-kali-focus`) and offset so keyboard users receive the same affordance anywhere.

| Variant | Purpose | Notes |
| --- | --- | --- |
| `primary` | High-emphasis actions like confirmations or primary CTA buttons. | Orange Ubuntu tone with dark text. |
| `secondary` | Neutral controls in panels or dialogs. | Muted cool-grey background, works on dark shells. |
| `ghost` | Low-emphasis triggers that sit on colored backdrops. | Transparent by default; add layout classes per context. |
| `destructive` | Destructive operations. | Red background, used sparingly. |
| `link` | Inline textual actions. | Zero padding, underline hover state. |

## Usage

Import from `components/ui` and pass extra layout classes as needed. Variants already cover hover and disabled states; only append custom classes for positioning or color overrides.

```tsx
import Button from '@/components/ui/Button';
import LinkButton from '@/components/ui/LinkButton';

<Button variant="primary" onClick={handleSubmit}>
  Save changes
</Button>

<LinkButton href="/docs" variant="link">
  View docs
</LinkButton>
```

Avoid reintroducing ad-hoc `className` strings for focus or disabled states—extend the shared variants instead.
