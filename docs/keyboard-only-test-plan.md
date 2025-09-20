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

## Menus and drawers
1. From the desktop, focus the **System status** button and press **Enter**.
   - The Quick Settings dialog should open with the Theme toggle focused.
   - Use **Tab** and **Shift+Tab** to cycle through all controls; focus should remain inside the dialog.
   - Press **Escape** to close the dialog and confirm focus returns to the System status button.
2. Focus the **Applications** button and press **Enter** or **Space** to open the Whisker menu.
   - Type to filter results and use the arrow keys to move the highlighted app tile.
   - Press **Escape** to close the menu and confirm focus returns to the Applications button.
3. Open the Nessus demo and focus the **Filters** button.
   - Press **Enter** to open the filter drawer; the first severity checkbox should receive focus.
   - Use **Shift+Tab** to verify focus loops to the last tag pill, then **Tab** to return to the first checkbox.
   - Press **Escape** to close the drawer and verify focus returns to the Filters button.
