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

## Tabbed window tiling
1. Focus a tabbed window (e.g., Terminal, HTTP Builder).
2. Hold **Option+Command** (macOS) or the **Windows** key (Windows/Linux) and press **ArrowLeft** repeatedly.
   - Verify the active tab cycles through ½, ⅓, and ¼ layouts anchored to the left edge.
3. Repeat with **ArrowRight** to cycle right-edge layouts and confirm a final press restores the floating tab.
4. Drag a tab while the overlay is visible and drop on each edge/corner target to confirm the resulting layout matches the label.
5. Reload the app and confirm the snapped configuration persists for the same session ID.

## Focus
1. After resizing or snapping, press **Tab** to move focus inside the window.
2. Continue pressing **Tab** to confirm focus can leave the window and is not trapped.
3. Shift+Tab moves focus backward as expected.
