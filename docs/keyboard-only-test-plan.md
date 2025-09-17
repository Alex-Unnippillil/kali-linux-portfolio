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

## Window Switcher (Alt+Tab)
1. With at least two windows open, hold **Alt** and press **Tab** to open the switcher overlay.
2. Use **Tab**, **ArrowUp**, or **ArrowDown** to cycle between entries and confirm the highlight moves.
3. Verify a screen reader announces the focused window, its position (e.g., “window 1 of 3”), whether it is selected, and the next window in the queue.
4. Repeat the test after changing the browser language; announcements should use the localized labels and number formatting for the active locale.
