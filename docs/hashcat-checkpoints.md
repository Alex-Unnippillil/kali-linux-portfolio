# Hashcat checkpoint storage

The Hashcat simulator now records progress snapshots so desktop sessions can be
resumed. Checkpoints are intentionally lightweight:

- **Storage backend:** `localStorage` under the key
  `hashcat.session.checkpoints.v1`. Each snapshot stores the current progress,
  attack metadata (hash type, mode, mask, rules), and worker timing values so
  the progress worker can restart exactly where it stopped.
- **Footprint:** every entry serialises to roughly 350–450 bytes depending on
  metadata. With the default retention of five checkpoints the total budget is
  under 2.5 KB per user.
- **Retention policy:** the newest five checkpoints are kept. Older entries are
  pruned automatically to prevent unbounded growth. Automatic checkpoints are
  generated every ten progress units while a session is running; users can also
  trigger a manual snapshot from the UI.
- **Corruption recovery:** malformed storage is detected during load and can be
  reset from the UI (or automatically in code) without breaking the session.

These checkpoints never leave the browser—they only exist to make the training
simulation feel closer to the real tool while staying safe for static exports
and offline demos.
