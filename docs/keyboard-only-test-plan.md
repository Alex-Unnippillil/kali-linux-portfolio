# Keyboard-Only Window Management Test Plan

## Moving
1. Open any window.
2. Focus the window.
3. Hold **Ctrl** and press arrow keys:
   - **Ctrl + ArrowUp** nudges the window upward.
   - **Ctrl + ArrowDown** nudges the window downward.
   - **Ctrl + ArrowLeft** nudges the window to the left.
   - **Ctrl + ArrowRight** nudges the window to the right.
4. Confirm the window remains within the desktop bounds and updates its position without dragging.
5. Open the window context menu (right click or **Shift+F10**) and activate any of the Move commands. The window should move in the corresponding direction.

## Resizing
1. With the window focused, use keyboard-only resizing:
   - **Shift + ArrowRight** increases width slightly.
   - **Shift + ArrowLeft** decreases width slightly.
   - **Shift + ArrowDown** increases height slightly.
   - **Shift + ArrowUp** decreases height slightly.
2. For larger jumps, hold **Ctrl + Shift** with the same arrows to resize in 2% increments.
3. Use the window context menu Resize commands to grow or shrink width/height and verify they match the shortcuts.

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
