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

## Taskbar reordering
1. Ensure multiple apps are open so that the taskbar shows at least two items.
2. Focus a taskbar item with **Tab** or the pointer.
3. Press **Alt + ArrowLeft** or **Alt + ArrowRight** to move the focused app.
4. Alternatively, activate the **Move left** or **Move right** buttons that appear when the item is focused.
5. Confirm the visual order changes and the focused app stays focused after reordering.

## Focus
1. After resizing or snapping, press **Tab** to move focus inside the window.
2. Continue pressing **Tab** to confirm focus can leave the window and is not trapped.
3. Shift+Tab moves focus backward as expected.
