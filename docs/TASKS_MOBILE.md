# Mobile Task Stubs — Desktop Optimizations

This document captures upcoming work focused on ensuring the desktop shell translates cleanly to mobile and small viewports. Each entry mirrors the structure used by `docs/TASKS_UI_POLISH.md`: acceptance criteria, file hints, and any helper code that already exists to accelerate the change.

## A) Shell & Window Manager

1. **Safe-area aware dock padding**
   - **Accept:** Dock respects `env(safe-area-inset-*)` values and never collides with device notches or gesture areas while keeping icons centered.
   - **Where:** `components/screen/desktop.js`, `styles/index.css`, and the dock layout helpers in `components/base/dock/*`.
   - **Code stub:** See `scripts/examples/mobile-task-stubs.ts` (`createSafeAreaStyle`) for a helper that merges measured safe-area values with existing Tailwind classes.

2. **Portrait window sizing preset**
   - **Accept:** On viewports with height ≥ width, newly spawned windows default to 90% width, clamp to 720 px max, and vertically center inside the safe viewport.
   - **Where:** `components/base/window/index.tsx`, window positioning utilities in `hooks/useWindowManager.ts`.
   - **Code stub:** `scripts/examples/mobile-task-stubs.ts` exports `getPortraitBounds` demonstrating how to derive the target rectangle using the desktop metrics store.

3. **Gesture-to-shortcut bridge**
   - **Accept:** Swiping left/right on the focused window dispatches the same events as Super+Arrow and temporarily reduces shadow blur during the animation.
   - **Where:** `hooks/useGestureBindings.ts`, `components/base/window/ShadowLayer.tsx`.
   - **Code stub:** `scripts/examples/mobile-task-stubs.ts` shows `registerSwipeShortcut` to normalize pointer events into shell shortcuts.

## B) Launcher & Menus

4. **Whisker menu reach mode**
   - **Accept:** A toggle in Settings mirrors the "One-handed mode" spec and repositions launch actions toward the bottom on mobile screens ≤ 480 px wide.
   - **Where:** `components/menu/WhiskerMenu.tsx`, `components/apps/settings/stores/menuPreferences.ts`.
   - **Code stub:** Use `applyReachModeLayout` in `scripts/examples/mobile-task-stubs.ts` for a layout skeleton that swaps flex direction and spacing tokens.

5. **Pinned search input on small screens**
   - **Accept:** Search input remains pinned while results scroll underneath; focus and escape key handling continue to work with screen readers.
   - **Where:** `components/menu/WhiskerMenu.tsx`, `styles/menu.css`.
   - **Code stub:** `scripts/examples/mobile-task-stubs.ts` exports `createStickySearchProps` that memoizes inline style objects for pinned headers.

## C) Performance & Perception

6. **Idle prefetch budget for mobile**
   - **Accept:** When `navigator.connection.saveData` is true or effective connection type is `3g`, idle prefetch is capped at one app and defers heavy bundles to interaction.
   - **Where:** `hooks/useIdlePrefetch.ts`, app registry utilities in `apps.config.js`.
   - **Code stub:** Reference `limitMobilePrefetch` from `scripts/examples/mobile-task-stubs.ts` which includes a guard for the Network Information API fallback path.

---

### How to use these stubs

Each stub in `scripts/examples/mobile-task-stubs.ts` exports a strongly typed helper with inline documentation. Import the relevant helper into your work branch, adapt it to production code, and add Jest coverage mirroring `__tests__/components/menu/WhiskerMenu.mobile.test.tsx` for regressions.
