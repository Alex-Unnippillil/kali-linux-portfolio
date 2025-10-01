# File Explorer Version Storage

The File Explorer keeps a lightweight version history for files opened through OPFS or directory permissions. Snapshots are
stored in the Origin Private File System under an internal `__versions` directory with metadata tracked via IndexedDB. A default
policy retains the five most recent saves for up to 30 days, and users can adjust both limits from the File Explorer UI.

## Storage footprint

* Each version is saved as a plain-text blob. Binary files are not diffed or compressed.
* OPFS inherits browser quota rules. Chromium-based browsers typically cap OPFS usage at ~60% of available disk space, while
  Safari can enforce much lower limits. Keep payloads small and avoid storing large archives.
* IndexedDB metadata is tiny (< 1 KB per version) but counts toward the same origin quota.

## Guardrails

* Retention policies are enforced automatically after every save and during startup GC. Max versions cannot drop below one, and
  day-based expiry can be disabled by setting it to zero.
* If OPFS or IndexedDB is unavailable (private browsing, unsupported browser), the version store falls back to in-memory mocks
  so the UI continues to work without persisting historical data.
* Upload-only sessions (using the non-OPFS fallback) never record versions to avoid leaking data outside the current page.
* When quota pressure triggers OPFS failures, the app surfaces a generic error in the version history panel instead of crashing.
  Users can lower retention to free space.

## Best practices

* Encourage users to export critical files frequently; browser storage is not a backup.
* Treat OPFS data as local to the device and browser profile—clearing site data removes every version.
* Avoid storing secrets or high-value artifacts in the version store. The retention UI makes it easy to zero out history if
  sensitive material was captured accidentally.
