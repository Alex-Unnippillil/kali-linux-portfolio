# Accessibility Audit Report

## Summary
- **Scan rules**: label, color-contrast, focus-order-semantics.
- **pa11y targets**: `/`, `/apps`, and 10 app windows.
- **Issues found**: 0 errors, 0 warnings, 0 notices.

## Key Fixes
- Replaced generic elements with semantic buttons for app icons and window title bars.
  - `components/base/ubuntu_app.js`
  - `components/base/window.js`
- Updated wallpaper picker to use semantic buttons.
  - `components/apps/settings.js`
- Added automated axe CLI and Playwright checks under `__tests__/`.

## Before / After Examples
```diff
- <div role="button" aria-label={this.props.name} aria-disabled={this.props.disabled} ...>
+ <button type="button" aria-label={this.props.name} disabled={this.props.disabled} ...>
```
```diff
- <div role="button" ...>
+ <button type="button" ...>
```
```diff
- <div role="button" aria-label={`Select ${name.replace('wall-', 'wallpaper ')}`} ...></div>
+ <button type="button" aria-label={`Select ${name.replace('wall-', 'wallpaper ')}`} ...></button>
```
