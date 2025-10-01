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

## Contextual actions and quick settings
1. With any desktop tile or taskbar item focused, press **Shift + F10** to open its context menu. The first menu item should receive focus automatically.
2. Use arrow keys to move between menu items. Press **Escape** to close the menu and return focus to the item that opened it.
3. Open the quick settings popover from the system status button and verify focus lands on the Theme toggle. Tab forward and backward to confirm focus stays within the popover until you dismiss it with **Escape**.
