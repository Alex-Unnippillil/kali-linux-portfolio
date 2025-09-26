# Keyboard navigation audit

_Date: 2025-02-14_

## Scope

The audit covered the desktop chrome rendered by `components/screen/desktop.js`, including:

- Dock launcher (`components/screen/side_bar.js`)
- Application overlays (all apps launcher, shortcut selector, window switcher)
- Quick settings menu in the status bar
- Supporting focus transitions between open windows and overlays

## Findings

| Area | Observation | Impact | Resolution |
| ---- | ----------- | ------ | ---------- |
| Dock launcher | “Show Applications” control implemented as a `<div>` without keyboard semantics. | Keyboard users could not open the launcher without a mouse. | Converted to a `<button>` with `aria-haspopup`/`aria-expanded`, focus styles, and tooltip focus handling. |
| All apps overlay | Overlay relied on default tab order, had no Escape handling, and did not return focus to the launcher. | Focus escaped to underlying desktop, and there was no clear exit for keyboard users. | Added `useFocusTrap`, dialog semantics, explicit close control, Escape handling, and focus restoration. |
| Shortcut selector | Mirrored issues from all-apps overlay (no focus trap or Escape). | Same as above. | Applied shared focus trap utilities, close button, and Escape handling. |
| Window switcher | Input auto-focused but dialog lacked semantics, focus trap, and actionable options. | Tab navigation left the overlay, and assistive tech could not identify the UI as a dialog. | Added dialog roles, focus trap, close control, and keyboard-focusable option buttons. |
| Quick settings | Menu rendered inside a button, exposed no focus order, and lacked Escape handling. | Screen reader and keyboard users could not reliably interact or exit. | Detached the menu from the trigger button, added dialog semantics, focus trap, close controls, and Escape support. |

## Follow-up checks

- Added automated accessibility regression tests in `__tests__/overlays.a11y.test.tsx` using Testing Library and `jest-axe` to cover each overlay flow.
- Manual tab-through verification ensured the dock button, overlays, and quick settings return focus to their trigger after closing.

## Outstanding considerations

- Context menus still rely on mouse interaction; a separate pass should add keyboard entry points.
- Launcher analytics events were unaffected, but QA should confirm GA dashboards still align after structural changes.
