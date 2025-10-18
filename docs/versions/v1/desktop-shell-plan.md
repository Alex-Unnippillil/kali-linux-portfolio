# Desktop Shell Plan

## Current Responsibilities

### `components/screen/desktop.js`
- Declares overlay metadata (launcher, shortcut selector, window switcher, command palette) and manages normalized state maps so each overlay tracks `open`, `minimized`, `maximized`, `focused`, and launcher transition state flags.【F:components/screen/desktop.js†L108-L158】
- Bootstraps multi-workspace scaffolding: four workspaces, snapshot storage for window state per workspace, and overlay-aware defaults for focused/closed/minimized windows along with persisted window sizes and desktop layout settings.【F:components/screen/desktop.js†L183-L360】
- Coordinates runtime shell behavior including workspace switching, stack promotion, and broadcasting `workspace-state` custom events so other modules can react to active workspace, running apps, and icon sizing changes.【F:components/screen/desktop.js†L2440-L2501】
- Provides overlay orchestration helpers (`syncOverlayWindowFlags`, `updateOverlayState`, `openOverlay`, `closeOverlay`, `restoreOverlay`) that encapsulate focus, transitions, and minimization semantics for both system overlays and app windows.【F:components/screen/desktop.js†L1599-L1779】【F:components/screen/desktop.js†L2788-L2835】
- Handles global shortcuts, including forwarding `super-arrow` events for snapping commands and toggling overlays based on keyboard combos, anchoring accessibility focus loops to overlays such as the all-apps view.【F:components/screen/desktop.js†L2986-L3070】

### `components/base/window.js`
- Hosts the draggable, resizable window primitive, normalizing top insets, safe areas, and snap grid defaults while tracking open/maximized/minimized/focus state on behalf of the shell.【F:components/base/window.js†L69-L138】
- Calculates snap regions and labels for halves and quarters of the viewport, accounting for safe area insets and taskbar offsets to keep snapping consistent across device orientations.【F:components/base/window.js†L31-L67】
- Responds to viewport changes by recomputing drag boundaries, safe-area padding, and accessible focus handling, and listens for shell-level events such as `super-arrow` to trigger snapping gestures programmatically.【F:components/base/window.js†L118-L210】

### `components/desktop/Layout.tsx`
- Wraps the desktop surface with shared CSS variables, touch-action rules, and responsive taskbar/desktop icon metrics that downstream shell components rely on for sizing and hit targets.【F:components/desktop/Layout.tsx†L6-L135】

## Planned OS-Grade Enhancements

| Enhancement | Acceptance Criteria | Primary Modules |
| --- | --- | --- |
| Multi-monitor awareness | Detect multiple viewports, render independent workspace stacks per display, and ensure overlays open on the active monitor with correct safe-area variables. | `components/screen/desktop.js`, `components/desktop/Layout.tsx`, utilities in `utils/windowLayout` |
| Tiling presets | Offer predefined tiling layouts (e.g., 2x2 grid, 3-column) that windows can join, respecting existing snap regions and exposing UI affordances via overlays. | `components/base/window.js`, `components/screen/desktop.js`, overlay components for layout selection |
| Accessibility hooks | Provide ARIA live regions for workspace changes, announce overlay focus shifts, and expose keyboard shortcuts in context menus. | `components/screen/desktop.js`, context menu components, accessibility utilities |
| Touch and pen gestures | Support touch-friendly snapping, long-press context menus, and pen/stylus drag heuristics without regressing mouse/keyboard behavior. | `components/base/window.js`, `components/screen/desktop.js`, gesture utilities |

## Internal APIs & Refactor Opportunities

- **Overlay registry** — IDs such as `overlay-launcher`, `overlay-shortcut-selector`, `overlay-window-switcher`, and `overlay-command-palette` are centralized for consistency; consider extracting them into a typed module so overlays and analytics share the same contract.【F:components/screen/desktop.js†L108-L135】
- **Overlay state transitions** — `updateOverlayState`, `openOverlay`, and `closeOverlay` merge overrides while enforcing default flags. Refactor into a standalone overlay manager to decouple state mutation from `Desktop`’s render cycle and enable unit testing of transition states.【F:components/screen/desktop.js†L1599-L1779】【F:components/screen/desktop.js†L2788-L2835】
- **Workspace telemetry events** — `workspace-state` broadcasts summarize workspace metadata; future refactors could formalize an event bus so external components subscribe through hooks rather than raw `window` listeners.【F:components/screen/desktop.js†L2492-L2501】
- **Keyboard-driven snapping** — `super-arrow` custom events tie desktop shortcuts to window-level handlers; abstracting event constants and snap math (currently in `Window`) into `utils/windowLayout` would clarify responsibilities between shell command routing and geometry calculations.【F:components/screen/desktop.js†L2986-L3010】【F:components/base/window.js†L31-L67】

## Verification Steps for Future Shell Features

Link each roadmap item to required verification coverage:

- **Multi-monitor awareness** — ✅ Unit tests covering workspace replication per monitor and overlay targeting logic; ✅ Playwright interaction tests validating monitor-specific focus and overlay placement; ✅ Telemetry assertions ensuring `workspace-state` events include monitor IDs.
- **Tiling presets** — ✅ Geometry unit tests for tiling calculations leveraging snap utilities; ✅ Interaction tests that drag windows into presets and confirm tiling overlays; ✅ Instrumented analytics verifying preset selections emit structured events via the overlay manager.
- **Accessibility hooks** — ✅ Jest tests for live-region messaging and keyboard shortcut registration; ✅ Axe/pa11y runs validating ARIA attributes on overlays; ✅ Telemetry hooks confirming assistive events (focus shifts, announcements) are logged when analytics is enabled.
- **Touch and pen gestures** — ✅ Unit tests around gesture state machines; ✅ Cross-input interaction tests simulating touch/pointer events for snapping and context menus; ✅ Telemetry sampling that tracks gesture adoption without degrading mouse metrics.

Each verification bundle should become a checklist item in feature PRs and update the roadmap to reference the corresponding tests and metrics, ensuring shell regressions are caught before release.
