# RTL-Safe Styling Checklist

The desktop shell now supports switching between left-to-right (LTR) and right-to-left (RTL) layout directions. Use the guidelines below to keep new UI work compatible with both flows.

## 1. Respect the global `dir`

- The `SettingsProvider` keeps `document.documentElement.dir` in sync with the saved user preference. Do **not** override it locally.
- Prefer logical CSS properties (`padding-inline-start`, `margin-inline-end`, etc.) over physical left/right values. When Tailwind utilities are unavoidable, add explicit inline styles or component logic to keep both directions aligned.

## 2. Reusable RTL helpers

- `styles/rtl.css` exposes two helpers:
  - `.rtl-inline-reverse` reverses a flex row only when `[dir='rtl']` is active.
  - `.rtl-flip` mirrors icons or glyphs that imply direction.
- Apply these classes to navigation controls, arrows, or other asymmetric visuals.

## 3. Components to mirror

- Tabs, menus, and cards now use logical padding and `textAlign: 'start'`. Follow the same pattern in new components to avoid hard-coded `text-left` or `pr-*` classes.
- When positioning adornments (like search icons inside inputs), prefer logical offsets (`inset-inline-start`) instead of `left`/`right`.

## 4. Testing

- Add smoke coverage for RTL whenever you introduce a new screen or complex layout. You can reuse the helpers in `__tests__/rtl.smoke.test.tsx` to render components under an RTL `SettingsContext`.
- When debugging manually, toggle the layout direction from the Settings drawer; the value persists via `app:direction`.

Keeping these habits ensures the Kali desktop remains legible and navigable for RTL readers.
