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

## RTL locales
1. With the site language set to a right-to-left locale, confirm the help overlay mirrors its layout.
2. Verify the overlay's guidance reflects RTL behavior:
   - **ArrowRight (→)** should be documented as moving focus or pieces visually to the left, with **ArrowLeft (←)** moving to the right.
   - **Ctrl+ArrowRight** must be described as jumping to the previous word and **Ctrl+ArrowLeft** as moving to the next word.
3. Ensure the mirrored instructions appear for apps that mention arrow keys even when custom key bindings are available.
