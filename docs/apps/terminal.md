# Terminal app

The Kali-inspired terminal emulation provides a resizable xterm.js surface that now reads and writes its appearance settings through the global settings store.

## Persistent preferences

- **Font scale (`terminalFontScale`)** – multiplies the base 14px xterm font. Stored values are migrated automatically from the legacy `terminal-font` key.
- **Theme (`terminalTheme`)** – maps to predefined palettes (`kali`, `matrix`, `paper`) and is migrated from the legacy `terminal-theme` key.
- **Window size (`terminalSize`)** – captures the pixel width and height produced by the draggable window and replaces the old `terminal-size` localStorage entry.

Values are synchronised through the `SettingsProvider`, so changing them from the desktop settings panel or within the terminal overlay updates every mounted instance without a reload.

When history files are restored from the Origin Private File System (OPFS), the saved font scale and theme are applied before the banner text renders to avoid flashes.

## User experience notes

- The settings overlay now indicates that changes persist between sessions, matching the behaviour of the new store entries.
- The toolbar’s settings button advertises “Terminal settings (auto-save)” for screen readers and tooltips.
- Import/export of desktop preferences now carries the terminal appearance settings alongside other options, and “Reset Desktop” restores the defaults defined in `utils/settingsStore`.
