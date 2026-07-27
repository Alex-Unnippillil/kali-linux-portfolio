# VirtualList Integration Guide

The `components/common/VirtualList` component provides windowed rendering, sticky header support, and built-in keyboard navigation for datasets that can easily reach tens of thousands of rows. It replaces the previous `rc-virtual-list` dependency and is optimized for 60 fps scrolling on mid-range hardware.

## Quick start

```tsx
import VirtualList from '@/components/common/VirtualList';

const rows = Array.from({ length: 10_000 }, (_, index) => ({
  id: index,
  label: `Row ${index + 1}`,
}));

export function Example() {
  return (
    <VirtualList
      data={rows}
      itemHeight={40}
      itemKey="id"
      height={420}
      component="ul"
      className="list-none p-0"
      stickyHeader={<Header />}
      stickyIndices={[0]}
    >
      {(row) => (
        <li key={row.id} className="px-4 py-3">
          {row.label}
        </li>
      )}
    </VirtualList>
  );
}
```

## Feature highlights

- **Windowed rendering.** Only the rows that intersect the viewport (plus an overscan buffer) mount, keeping DOM nodes under ~70 even with 10 k+ inputs.
- **Measurement caching.** Heights are cached and updated via a shared `ResizeObserver` with `requestAnimationFrame` throttling to keep scroll handlers lightweight.
- **Auto sizing.** Pass an explicit `height` or allow the component to track its container with `ResizeObserver` and fallback resize listeners.
- **Sticky headers and items.** Use `stickyHeader` for static content and `stickyIndices`/`renderStickyItem` when a virtualized row should pin to the top once it scrolls out of view.
- **Keyboard navigation.** PageUp/PageDown/Home/End moves focus and scroll position. Focus is retained across virtualization boundaries so screen-reader and keyboard users remain anchored.

## Core props

| Prop | Description |
| --- | --- |
| `data` | Array of records to virtualize. |
| `itemHeight` | Estimated row height in pixels. Used before measurements complete. |
| `itemKey` | Field name or callback that resolves a stable React key. |
| `height` | Optional explicit viewport height. When omitted the component observes its parent height. |
| `component` | Wrapper element (`'div'`, `'ul'`, `'ol'`). Defaults to `'div'`. |
| `className` / `style` | Applied to the inner list. |
| `containerClassName` / `containerStyle` / `containerProps` | Customize the scroll container. |
| `overscan` | Number of extra items to render above and below the viewport. Defaults to `6`. |
| `stickyHeader` | React node rendered in a sticky wrapper above the list. |
| `stickyIndices` & `renderStickyItem` | Supply row indices that should pin when scrolled beyond the viewport. Optionally override the sticky rendering with `renderStickyItem`. |
| `scrollBehavior` | `'smooth'` or `'auto'` scrolling for programmatic focus changes. Defaults to `'smooth'`. |

## Accessibility & keyboard support

The component exposes the inner element with `role="list"` (or `role` override) and manages `tabIndex` so the focused row always remains keyboard reachable. PageUp/PageDown/Home/End are handled automatically through the `useVirtualListNavigation` hook. When you render focusable content inside each row, ensure it respects the forwarded `onFocus` and `tabIndex` props to keep focus tracking intact.

## Sticky headers in practice

- Use `stickyHeader` for static summaries (filters, counts, metadata). The wrapper already applies `position: sticky; top: 0`.
- Use `stickyIndices` when a specific record should float with scrolling. For example, the Post-Exploitation catalog pins the first module so the quick actions remain visible. Provide `renderStickyItem` to customize the pinned appearance.

## Migration checklist

1. Import `VirtualList` from `components/common/VirtualList`.
2. Provide `data`, `itemHeight`, and `itemKey` (string or callback).
3. Replace legacy `component="ul"` / `className` usage—the new component forwards them to the inner element.
4. If you relied on external keyboard handlers, remove them. The component now handles PageUp/PageDown/Home/End and exposes accessible focus rings out of the box.
5. For sticky summaries, add a `stickyHeader`. For row pinning, configure `stickyIndices` + `renderStickyItem`.
6. Run `yarn test postExploitation` or the updated VirtualList tests to ensure virtualization behaves as expected.

Following these steps keeps the UI smooth even with tens of thousands of items, while maintaining consistent keyboard and screen-reader behaviour across the desktop portfolio.

