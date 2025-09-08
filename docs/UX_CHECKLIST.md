# UX Checklist

- [ ] Verify reduced motion preference persists and toggles `.reduced-motion` class.
- [ ] Verify high contrast preference persists and toggles `.high-contrast` class.
- [ ] Focus ring uses `--focus-outline-*` tokens and is visible in all themes.
- [ ] Resize handles are larger and show accent on hover.
- [ ] Snap preview displays with accent background (use high contrast mode to confirm).
- [ ] App grid icons use `--icon-spacing` and `w-app-icon` sizing for tighter layout.
- [ ] Prefetch hints appear only on fast connections and supported tiles.

## GIF Plan

Use `npm run dev` and a screen capture tool:
1. Capture before/after of focus ring and resize handles.
2. Capture toggling high-contrast and reduced-motion in settings.
3. Capture app grid spacing and hover prefetch behaviour.
