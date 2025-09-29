# Launcher Grid Layout Notes

The launcher grid now relies on CSS container query units (`cqw`/`cqh`) to scale tile padding and spacing with the menu panel. The grid container is marked with `container-type: size` so both width- and height-based units can respond to the available space.

## Responsive behaviour

- **Auto mode** keeps the legacy breakpoints (8/6/5/4/3 columns) but recalculates columns with a `ResizeObserver`, so the layout adapts seamlessly as the launcher is resized.
- **Manual column modes** (3, 4, or 5) let users override the automatic calculation. The choice is stored under the `launcher-grid-column-mode` key in `localStorage` so it persists between sessions.
- Keyboard navigation matches the visual order. Arrow keys move focus by row/column without disrupting the natural tab sequence.

## Browser fallback

Older browsers that do not support container queries ignore the `cqw`/`cqh` rules. Tailwind utility classes (`gap-4`, `min-h-[112px]`, fixed padding) provide a pixel-based baseline layout, so the grid remains usable even without container query support.
