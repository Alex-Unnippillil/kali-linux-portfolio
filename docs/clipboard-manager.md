# Clipboard Manager Overlay

The Clipboard Manager captures clipboard entries locally using IndexedDB so the history persists between sessions. Key behaviors:

- Stores up to **25 unpinned entries** from the last 24 hours. Older unpinned clips are pruned automatically while pinned clips remain regardless of age.
- Saves timestamps and pin state for each entry so the UI can show sections for pinned and recent history.
- Filters copied text through `utils/redaction.ts`; potential secrets are skipped and surfaced as warning badges instead of being stored.
- Provides instant search with highlighted matches, plus arrow key navigation and <kbd>Enter</kbd> to copy the selected entry.
- `Ctrl` + `Shift` + `V` opens the overlay window, mirroring the OS shortcut for clipboard history.

Use the **Pin** button to keep critical entries at the top and **Clear history** to remove all stored items. The manager falls back gracefully if the browser disables clipboard APIs or IndexedDB.
