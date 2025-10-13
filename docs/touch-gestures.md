# Touch gestures and tablet support

The desktop shell now exposes responsive breakpoints and gesture affordances so it remains usable on convertible laptops and tablets.

## Responsive shell metrics

- The new `components/desktop/Layout.tsx` component defines CSS custom properties for taskbar height, padding, and desktop icon sizing.
- Breakpoints progressively scale hit targets from 40px to 60px+ widths, and `(pointer: coarse)` media queries ensure touch-first devices immediately receive larger dimensions.
- `UbuntuApp` tiles, the dock/taskbar, and window chrome consume these variables so every interactive surface respects the same sizing rules.

## Panel defaults on tablets

- `components/panel/Preferences.tsx` inspects the `pointer: coarse` media query before reading from `localStorage`.
- When no preference is stored, tablets default to a 40px panel, full length, and autohide enabled. Mouse/trackpad configurations keep the slimmer 24px bar.
- The listener also reacts to pointer-mode changes on convertibles so rotating the hinge updates defaults without overwriting explicit user choices.

## Gestures

Two touch gestures are available when the shell detects a coarse pointer:

- **Swipe-to-snap:** a quick single-finger horizontal swipe on the focused window dispatches the same shortcut as <kbd>Super</kbd>+<kbd>Arrow</kbd> and snaps the window left or right.
- **Three-finger overview:** a three-finger upward swipe opens the window switcher/overview. Lifting all three fingers resets the gesture state.
- **Window move long-press:** dragging the title bar on touch hardware now requires ~200&nbsp;ms of contact plus a ~12&nbsp;px travel threshold before the window actually moves. This keeps vertical scrolling fluid while still enabling intentional repositioning.

Both gestures rely on low-latency thresholds and ignore slow drags to avoid conflicting with window moves.

## Convertible testing notes

Testing used Chrome DevTools' device emulation to toggle `pointer: coarse`, adjust viewport sizes, and simulate three-finger gestures. Validate on hardware by:

1. Opening DevTools → Rendering → Emulate CSS media feature → set `pointer` to `coarse`.
2. Reloading the desktop and verifying enlarged dock buttons and desktop icons.
3. Using the touch emulator (or a touchscreen) to swipe windows for snap and a three-finger upward motion to open the overview.

Documenting the procedure ensures QA for actual 2-in-1 hardware can replay the steps and compare against emulated results.
