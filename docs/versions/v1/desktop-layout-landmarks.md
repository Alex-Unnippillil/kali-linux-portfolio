# Desktop Layout Landmarks

The desktop shell renders a single semantic landmark for assistive technology:

- `<main id="desktop">` is the sole main region and wraps the entire workspace.
- `#window-area` hosts window instances, overlays, and menus that should remain descendants of the main element without redefining new landmarks.
- Floating utilities (context menus, switchers, selectors) are rendered as descendants of the main region and should use `role="presentation"` or more specific roles (e.g., `menu`, `dialog`) when necessary.

## Guidelines

1. **Do not add another `<main>` or an element with `role="main"` inside the desktop shell.** Screen readers expect exactly one primary landmark.
2. Use semantic sectioning elements (`section`, `nav`, `aside`) with appropriate `aria-label`s if a feature needs its own navigation context.
3. When adding overlays or modals, ensure they manage focus and announce themselves via `role="dialog"` or similar patterns instead of reusing the main landmark.
4. Keep `#window-area` as the structural container for windowed apps. If a feature needs its own root node, mount it under this container without promoting it to a landmark.

Following these rules keeps the workspace accessible and prevents regressions like nested main regions.
