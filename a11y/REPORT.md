# Accessibility Audit Report

## Summary
- **Scan rules**: label, color-contrast, focus-order-semantics.
- **pa11y targets**: `/`, `/apps`, `/apps/settings`, and 11 app windows.
- **Issues found**: 0 critical, 0 serious, 0 moderate, 0 minor.

## Key Fixes
- Converted wallpaper picker to semantic buttons and removed role-based focus styles.
  - [components/apps/settings.js](../components/apps/settings.js)
  - [styles/index.css](../styles/index.css)
- Added automated axe CLI and Playwright checks with WCAG 2.2 tags under `__tests__/`.

## Before / After Examples
```diff
- <div role="button" aria-label={...} aria-pressed={...} tabIndex="0" ...></div>
+ <button type="button" aria-label={...} aria-pressed={...} ...></button>
```
```diff
- button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"], .hit-area {
+ button, input[type="button"], input[type="submit"], input[type="reset"], .hit-area {
```
