# Motion tokens for the Whisker menu

The Whisker menu uses shared motion primitives so opening, closing, and list view transitions stay synchronized.

- `--whisker-menu-transition-duration`: declared in `styles/tokens.css`, currently `190ms` to stay inside the 180–200ms Ubuntu desktop guidance range.
- `--whisker-menu-transition-easing`: declared in `styles/tokens.css`, currently `cubic-bezier(0.4, 0, 0.2, 1)` (the standard material-inspired ease).
- `.whisker-menu-motion`: defined in `styles/index.css`. Apply this class alongside a `transition` or `transition-all` utility to hook into the shared duration and easing without redefining them inline.
- `MENU_TRANSITION_FALLBACK_MS`: a TypeScript constant inside `components/menu/WhiskerMenu.tsx` that mirrors the CSS duration. The component reads the CSS custom property on the client; the fallback keeps SSR logic safe if the variable is unavailable.

When creating new interactions around the menu, reuse `.whisker-menu-motion` or read the same custom properties so close timers and animations stay in sync.
