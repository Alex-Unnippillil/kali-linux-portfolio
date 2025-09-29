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

## Focus indicators across UI surfaces
1. Open the applications menu and press **Tab** to move through launchers. Each item should display the Tailwind focus-visible ring.
2. Trigger a modal (settings, dialog, or confirmation). Use **Tab** and **Shift+Tab** to cycle through controls and confirm the ring remains visible on each element.
3. Navigate to a form (contact app or terminal command input). Use the keyboard to focus fields and ensure focus-visible tokens remain active, then click with the pointer to confirm focus outlines are suppressed for pointer-only interactions.
