# UX Checklist

## Reduced Motion & High Contrast Themes
- [x] Preferences persisted via `SettingsProvider`.
- [ ] Before/After GIF: toggle reduced motion.
- [ ] Before/After GIF: toggle high contrast.

## Focus Rings and Window Interactions
- [x] Focus outlines use tokenized offset and accent color.
- [x] Enlarged resize handles with hover affordance.
- [ ] Before/After GIF: resizing window and snap preview.

## App Grid Tweaks
- [x] Smaller icons and tightened spacing.
- [x] Prefetch hint on hover when available.
- [ ] Before/After GIF: app grid spacing.

## Animation Strategy
- [x] Prefetch scheduled with `requestAnimationFrame` to avoid layout thrash.
- [ ] Verify no layout shifts during icon animations.

## GIF Generation Plan
1. Use `npm run dev` and record the screen with a tool like [peek](https://github.com/phw/peek).
2. Capture before state from `main` branch, then after applying this patch.
3. Trim and optimize GIFs using `gifsicle`.
