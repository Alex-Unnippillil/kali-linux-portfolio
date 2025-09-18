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

## Focus indicators and exceptions
- All taskbar icons, launcher tiles, and global menus now share the accent-colored focus ring token. Verify the outline appears on focus-visible states in both default and high-contrast themes.
- The boot screen power control supports **Enter** and **Space**. Focus it with **Tab** to confirm the blue/yellow ring renders before activating the desktop.
- The window switcher exposes its results list as a focusable listbox. After the search field, press **Tab** to step through window thumbnails and use **Enter**/**Space** to activate the highlighted entry. Arrow keys continue to work for cycling without moving focus.
