# Desktop state management

## Window layout persistence

- Window positions, sizes, snap states, and maximized flags are serialized to
  `localStorage` under the key `desktop-window-layouts`. The shape is
  `{ version, displays: { [displayId]: { [windowId]: layout } } }`.
- Each display is keyed by a stable identifier derived from `window.screen`
  metrics (resolution + offsets). When a user moves the app between monitors,
  the layout is stored independently per display.
- `WindowLayout` entries capture:
  - `x`/`y` in pixels relative to the viewport (rounded to the snap grid when
    enabled).
  - `widthPct`/`heightPct` percentages for resizable windows so they scale with
    the viewport size.
  - `snapped` (`left`, `right`, or `top`) and `maximized` flags.
  - Optional `lastWidthPct`/`lastHeightPct` values to restore original sizing
    when unsnapping.

## Hydration rules

- On boot the desktop loads any stored layouts for the current display via
  `loadWindowLayouts`. Layouts are clamped against the current viewport so they
  always appear within visible bounds, even after a resolution change.
- Snap/tiling metadata is included with each layout so windows can reapply
  their snapped transforms on mount.
- If a layout would otherwise render off-screen (negative coordinates or past
  the viewport width/height), the helper clamps it before returning and writes
  the sanitized values back to storage.

## Legacy migrations

- `loadWindowLayouts` automatically migrates prior formats:
  - Plain objects that mapped window IDs to `{ x, y }` records.
  - Arrays of window records (e.g., the old session format).
  - The legacy `desktop-session` payload saved by `useSession`.
- Migrated layouts are re-serialized to the new structure and tied to the
  active display ID. Old keys remain untouched so existing exports continue to
  work, but the canonical data now lives in `desktop-window-layouts`.
- `resetSettings` clears the new storage key to reset all persisted layouts.

## Testing

- Unit tests (`__tests__/windowLayoutPersistence.test.ts`) cover:
  - Round-tripping layouts through the save/load helpers.
  - Clamping of extreme coordinates to keep windows on-screen.
  - Migration from the historical `desktop-session` structure.
  - `mergeLayout` clamping logic when applying partial updates.

