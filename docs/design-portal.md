# Design Portal

## Content
- **Icon labels** sample the active wallpaper to determine text treatment. Use a light text shadow on high-contrast scenes and automatically switch to a blurred, translucent plate when the sampled contrast ratio falls below 4.5:1.
- **Label visibility** obeys the “Hide labels when grid is tidy” preference stored in `desktop:settings`. When enabled, tidy (snap-to-grid) layouts only show tooltips on hover and screen readers use the icon `aria-label`.
- **Accessibility** rely on the shared `utils/color/contrast` helpers for luminance and contrast checks. Never ship custom math that doesn’t meet WCAG AA.
- **Caching** reuse wallpaper swatches so that icon rendering stays under 4 ms per frame on mid-tier hardware. Only re-sample when the wallpaper changes.
