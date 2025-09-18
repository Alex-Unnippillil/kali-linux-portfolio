# Multi-display window QA checklist

These notes outline how the desktop shell should behave when more than one
virtual display is configured. Use them when validating regressions or setting
up exploratory tests.

## Display layout overrides

* Tests and debug sessions can provide a virtual layout by assigning an array of
  display descriptors to `window.__KALI_DISPLAY_OVERRIDE__` before the desktop
  renders.
* Each descriptor accepts `id`, `x`, `y`, `width`, `height`, and `scale`. The
  coordinate space matches the browser viewport (positive `x` moves windows to
  the right, positive `y` moves them down).
* Call `window.__kaliResetDisplayLayout()` in the console to return to a single
  display using the current viewport dimensions.

## Expected window behaviour

* Window dragging respects the active display bounds. When a window crosses a
  display boundary its target display is detected using the window's centre
  point. If the centre lies between displays, the one with the greatest overlap
  area wins.
* After a display change the window resizes based on the destination scale
  factor. Size changes are clamped to the destination's workspace, with a 20%
  minimum to keep content usable.
* Transitions between displays animate over ~220 ms. Windows should remain fully
  visible during the animation. Motion is disabled for users that prefer reduced
  motion.
* Snapping, maximising, and keyboard nudges keep windows inside their assigned
  display.
* Session persistence records the most recent `{ x, y, displayId }` tuple for
  each open window. Reloading restores windows on their previous displays.

## Manual test passes

1. Configure two displays with different scale factors (for example 1280×800 @1x
   and 1600×900 @1.5x) using the override helper.
2. Drag the default `about-alex` window between displays. Verify that the window
   resizes smoothly and the final dimensions match expectations for the target
   density.
3. Reload the page. Ensure the window reappears on the last display visited and
   that its size matches the stored scale.
4. Snap the window to each edge on both displays and confirm it never escapes
   the visible workspace.
5. Repeat with a triple-display layout that includes an off-axis monitor (for
   example, one display positioned higher or with a negative `x`). Verify clamping
   respects the composite workspace bounds.

## Automated coverage

* `__tests__/displayManager.test.ts` exercises layout clamping, overlap detection,
  and scaling helpers.
* `tests/multi-display.spec.ts` drives Playwright to drag windows between displays
  with different density ratios and validates persisted display IDs.

Always run `yarn lint`, `yarn test`, and `npx playwright test` before shipping
multi-display changes.
