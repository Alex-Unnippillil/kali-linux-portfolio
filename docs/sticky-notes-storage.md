# Sticky Notes Storage Model

The Sticky Notes utility stores every note client-side so it remains available across sessions without requiring any backend. The persistence pipeline now works as follows:

- **IndexedDB primary store.** Notes are saved into the `stickyNotes` database under the `notes` object store. Each record contains position, size, color, content, and `zIndex` metadata so the desktop window manager can restore ordering after reloads.
- **Graceful localStorage fallback.** If IndexedDB is blocked (for example, inside a private browsing session) the app automatically falls back to `localStorage`. Both reads and writes share the same JSON payload, so data migrates seamlessly once IndexedDB becomes available again.
- **Legacy migration.** Existing `localStorage` entries from earlier versions are imported into IndexedDB on first run and the legacy key is cleared to avoid duplication.
- **Shared text entries.** When the app launches with `?text=...` in the URL (used by the Web Share Target) the provided text is appended as a new note and saved through the same pipeline.

Because the data never leaves the browser, exporting or syncing notes still requires future work (tracked separately). For now, advise users to keep the app open in a trusted profile if they need long-lived notes.
