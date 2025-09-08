# Keyboard-Only Window Management Test Plan

## Resizing
1. Open any window.
2. Focus the window.
3. Hold <kbd>Shift</kbd> and press arrow keys:
   - <kbd>Shift</kbd>+<kbd>ArrowRight</kbd> increases width.
   - <kbd>Shift</kbd>+<kbd>ArrowLeft</kbd> decreases width.
   - <kbd>Shift</kbd>+<kbd>ArrowDown</kbd> increases height.
   - <kbd>Shift</kbd>+<kbd>ArrowUp</kbd> decreases height.
4. Verify the window resizes accordingly.

## Snapping
1. With the window focused, press arrow keys with <kbd>Alt</kbd>:
   - <kbd>Alt</kbd>+<kbd>ArrowLeft</kbd> snaps the window to the left half of the screen.
   - <kbd>Alt</kbd>+<kbd>ArrowRight</kbd> snaps it to the right half.
   - <kbd>Alt</kbd>+<kbd>ArrowUp</kbd> snaps it to the top half.
   - <kbd>Alt</kbd>+<kbd>ArrowDown</kbd> restores the window to its previous size and position.

## Focus
1. After resizing or snapping, press <kbd>Tab</kbd> to move focus inside the window.
2. Continue pressing <kbd>Tab</kbd> to confirm focus can leave the window and is not trapped.
3. <kbd>Shift</kbd>+<kbd>Tab</kbd> moves focus backward as expected.
