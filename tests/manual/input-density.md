# Input density QA checklist

Use this script after implementing input mode or density changes to ensure focus, hover, and touch targets adapt correctly.

## Setup

1. Start the development server (`yarn dev`) and load the desktop at http://localhost:3000.
2. Open the Quick Settings tray from the top bar so the new *Touch targets* toggle is visible.
3. Confirm `localStorage` has no stale overrides by clearing `display:density-lock` if present.

## Pointer + keyboard parity

- **Pointer hover**: With a mouse or trackpad, hover each Quick Settings row. Expect the row highlight to follow the pointer and controls to retain the compact density spacing.
- **Keyboard focus**: Close the tray, press `Tab` until focus returns to the tray trigger, then reopen it with `Enter`. Use arrow keys to move through rows. Each focused control should expand to the touch target height and display a visible focus ring.
- **Pointer transition**: Move the mouse again and ensure hover states resume without lingering keyboard focus styling.

## Touch override behaviour

1. Toggle *Touch targets* on. The panel rows should immediately grow to the 44px minimum height and the Quick Settings state should persist on reload.
2. With the toggle enabled, open DevTools → Device Toolbar and emulate a touch device. Tap through the Quick Settings controls; the hit targets should remain large and the hover styling should not appear.
3. Reload the page while the toggle remains on. Verify the density stays locked to the touch layout and `window.localStorage.getItem('display:density-lock') === 'touch'`.
4. Disable the toggle and confirm the layout reverts to the preferred density while hover states return for pointer input.

## Desktop shell integration

- Open an app that uses tabbed navigation (for example, any terminal or browser simulation) and verify tab headers respect the new density tokens.
- From the keyboard, cycle between tabs with `Ctrl+Tab` and ensure the active tab keeps the larger touch hit target when the lock is enabled.

Record findings and file a bug if any control fails to meet the expected hit target or focus treatment.
