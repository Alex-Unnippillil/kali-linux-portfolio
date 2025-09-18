# Touch & Pen Interaction QA Guide

This guide explains how to validate the new long-press context menu behaviour across the desktop surface, taskbar buttons, and application grids.

## Summary of expected behaviour

- A touch or pen press held for ~400 ms should open the relevant context menu (desktop, app icon, or taskbar item).
- A circular progress indicator should render under the finger/stylus during the hold. Releasing or moving far enough cancels the indicator.
- Regular taps or clicks should continue to activate the primary action without opening menus.
- Hover-specific styling must not “stick” on touch hardware. Hover highlights only appear on pointer devices that truly support hover.
- Assistive tech should announce that a long press reveals more options when focus lands on app icons or taskbar buttons.

## Manual device simulation (Chrome DevTools)

1. Open the site and toggle **Device Mode** (Ctrl/Cmd + Shift + M).
2. Pick any touch profile (e.g. “Pixel 7”) to enable touch simulation.
3. Long press on:
   - An empty area of the desktop background.
   - A desktop shortcut icon.
   - A running app button in the taskbar.
4. Verify that the radial indicator appears immediately, fills in ~0.4 s, and the context menu opens when the indicator completes.
5. Release before the indicator finishes and confirm the menu does not appear.
6. Drag slightly while holding; confirm the indicator cancels and no menu opens.
7. Toggle Device Mode off and ensure hover states still work with a mouse/trackpad.

## Playwright spot check

1. From the project root run `npx playwright codegen http://localhost:3000` (with `yarn dev` running).
2. In the recorder select **Emulate touch** (☝ icon) so Playwright sends touch pointers.
3. Record a long press on a desktop icon and export the script if needed for regression automation.
4. Stop touch emulation and confirm mouse clicks still open apps without the indicator.

## Accessibility verification

- Use a screen reader (NVDA/JAWS/VoiceOver) to focus a desktop icon or taskbar button.
- Confirm the announcement includes “Long press for more options” or the equivalent hint.
- Ensure the context menu remains keyboard-accessible via Shift + F10.

## Troubleshooting tips

- If the indicator appears but the menu does not, ensure the press lasted long enough and the pointer did not travel more than ~16 px.
- If hover highlights still trigger on touch hardware, confirm the device/emulation truly reports `hover: hover`; otherwise file a bug.
- If no indicator appears, verify that the pointer type is `touch`/`pen` (mouse/touchpad will not show it) and that the target element has a `data-context` attribute.

Document test results in the QA log, noting the device/emulation profile used and any anomalies.
