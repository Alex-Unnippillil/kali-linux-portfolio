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

## Dialogs & overlays
1. Trigger each overlay from its invoking control:
   - Press **Shift+?** to open the global keyboard shortcut overlay.
   - In **Settings → Edit Shortcuts**, open the keymap sheet.
   - Inside any game that uses the shared layout (e.g. **Tower Defense**), activate the **Help** button.
2. Tab forward and backward to confirm focus stays inside the dialog and loops.
3. Press **Escape** and verify the dialog closes and focus returns to the trigger element.
4. Automated coverage: `npx playwright test tests/dialog-focus.spec.ts` runs these checks end-to-end.
