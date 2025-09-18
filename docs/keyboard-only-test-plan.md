# Keyboard-Only Window Management Test Plan

## Resizing
1. Open any window.
2. Focus the window.
3. Hold **Shift** and press arrow keys:
   - **Shift + ArrowRight** increases width.
   - **Shift + ArrowLeft** decreases width.
   - **Shift + ArrowDown** increases height.
   - **Shift + ArrowUp** decreases height.
4. Verify the window resizes accordingly.

## Snapping
1. With the window focused, press arrow keys with **Alt**:
   - **Alt + ArrowLeft** snaps the window to the left half of the screen.
   - **Alt + ArrowRight** snaps it to the right half.
   - **Alt + ArrowUp** snaps it to the top half.
   - **Alt + ArrowDown** restores the window to its previous size and position.

## Focus
1. After resizing or snapping, press **Tab** to move focus inside the window.
2. Continue pressing **Tab** to confirm focus can leave the window and is not trapped.
3. Shift+Tab moves focus backward as expected.

## Reduced motion
1. Enable the OS-level or browser-simulated **Reduce Motion** preference (e.g., in Chrome DevTools under Rendering > Emulate CSS prefers-reduced-motion).
2. Refresh the desktop and verify window launches, close actions, and dock interactions change instantly without sliding or fading transitions.
3. Open the **Settings** app and toggle **Accessibility → Reduced motion** to confirm the in-app setting produces the same behaviour without reloading.
4. Reopen animated apps (e.g., Blackjack, app launcher overlay) and confirm chip pops, dealing animations, and cursor pulses remain static while content stays readable.
