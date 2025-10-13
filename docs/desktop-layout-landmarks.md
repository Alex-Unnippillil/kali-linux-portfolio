# Desktop Layout Landmarks

The desktop shell now exposes a complete set of labelled landmarks for assistive technology:

- `<div id="monitor-screen" role="region" aria-label="Desktop shell">` wraps the workspace.
- `<header aria-label="Desktop status bar">` contains the `<nav aria-label="Desktop navigation">` taskbar.
- `<main id="desktop" aria-label="Desktop workspace">` is the sole main region for the simulated desktop.
- `<div id="window-area" role="region" aria-label="Desktop window surface">` hosts dynamic window instances.
- `<aside aria-label="Desktop overlay menus">` groups context menus and overlays rendered above the workspace.
- `<footer role="contentinfo" aria-label="Desktop live updates">` announces live region messages.

## Guidelines

1. **Do not add another `<main>` or an element with `role="main"` inside the desktop shell.** Screen readers expect exactly one primary landmark.
2. Keep any new navigation or complementary sections labelled and mounted within the existing structure (header, nav, main, aside, footer).
3. When adding overlays or modals, ensure they manage focus and announce themselves via `role="dialog"` or similar patterns instead of redefining landmarks.
4. Keep `#window-area` as the structural container for windowed apps. If a feature needs its own root node, mount it under this container without introducing a second main region.

Following these rules keeps the workspace accessible and prevents regressions such as nested main regions or unnamed landmarks.
