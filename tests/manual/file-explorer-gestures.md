# File Explorer gesture QA script

This manual QA run confirms touch interactions live alongside keyboard and mouse controls in the File Explorer.

## Setup

1. Start the dev server: `yarn dev`.
2. Open the desktop UI at http://localhost:3000.
3. Launch the **Files** app.
4. Open the browser's developer tools and enable touch emulation (Chrome: `Ctrl+Shift+M`, choose a mobile preset and enable "Show device frame" if desired).

## Test cases

### 1. Long-press multi-select

- Tap and hold on a file tile for at least 0.5 seconds.
- **Expected:** the tile gains a visible focus ring and selection border, and the toolbar updates to show the number of selected items.
- Release and tap a second item with a short press.
- **Expected:** the second item opens when tapped briefly; repeat the long-press to add it to the selection without opening.

### 2. Lasso drag selection

- With touch emulation disabled, use the mouse to click and drag across empty space in the grid.
- **Expected:** a dashed selection rectangle appears while dragging and items touched by the rectangle become selected. Releasing the mouse finalizes the selection.
- Hold `Shift` while dragging to add items to the current selection without clearing existing selections.

### 3. Gesture-based rename

- Re-enable touch emulation.
- Double-tap a selected file tile.
- **Expected:** the tile switches to an inline text field with the filename pre-filled and focused.
- Edit the name and press the on-screen keyboard's enter action.
- **Expected:** the rename succeeds, the file re-renders with the new name, and the announcement banner confirms the rename. If rename fails (e.g., duplicate name), an inline error message appears.

### 4. Keyboard fallback

- Disable touch emulation.
- Use `Tab` to focus a tile, press `Space` to toggle selection, and `Enter` to open it.
- Press `F2` to trigger rename and `Escape` to cancel.
- **Expected:** keyboard controls mirror the touch gestures without requiring hover.

## Regression checks

- Saving a file still works after renaming (open a text file, edit content, and click **Save**).
- Finder search results continue to populate after using gesture features.
- No errors appear in the browser console throughout the script.
