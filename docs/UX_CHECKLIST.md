# UX Checklist

## Themes & Preferences

- Added high-contrast and reduced-motion variants in Tailwind.
- Preferences persist via `useSettings` and localStorage.

## Focus & Interaction

- Global `:focus-visible` ring using tokenised color and width.
- Enlarged window resize handles and rAF-driven snap previews.

## App Grid

- Tightened icon sizing and spacing.
- Hovering tiles with prefetch benefit show a subtle ring while assets preload.

## Animation

- Prefetch and snap hints use `requestAnimationFrame` to avoid layout thrash and CLS.

## GIF Plan

1. `yarn dev` to start the desktop locally.
2. Use `npx playwright screenshot` or another recorder to capture before/after GIFs of:
   - Toggling high-contrast and reduced-motion switches.
   - Resizing and snapping a window.
   - Hovering an app tile with prefetch.
3. Embed resulting GIFs into documentation or pull request description.
