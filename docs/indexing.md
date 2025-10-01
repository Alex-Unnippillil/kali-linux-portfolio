# Directory indexing architecture

The file explorer now builds an incremental inverted index inside a dedicated Web Worker. The worker walks the selected root folder and stores lightweight metadata for every file:

- **Metadata cache** – path, size, and last-modified timestamp are retained in memory so the UI can render progress and make freshness decisions.
- **Inverted index** – tokens extracted from text files are tracked per file, which allows the search API to target only likely matches before re-reading file contents for preview lines.
- **Handle cache** – the worker keeps the live `FileSystemFileHandle` for each path. These handles are invalidated automatically if the browser revokes access; the UI re-requests permission when reopening a folder.

### Storage footprint

- Token data is stored in memory only. The worker evicts entries as soon as the user cancels indexing and rebuilds the structure when a new folder is selected. By default files larger than **25 MB** are skipped to prevent unbounded growth. This limit can be tuned in `utils/indexer.ts`.
- No IndexedDB records are written. The only persistent data remains the existing "recent directories" list.

### Data lifecycle & invalidation

1. **Start** – selecting a folder starts a fresh job, clearing all cached metadata and tokens before scanning.
2. **Incremental updates** – when a file changes (for example after a save inside the editor) `updateFile` removes its previous tokens and reindexes just that path, keeping the rest of the cache intact.
3. **Cancellation** – cancelling or pausing the job stops the traversal immediately. Cancellation also purges the in-memory cache so a later `start` begins from a clean slate.
4. **Completion** – when a job completes, the cache remains available for searches. Opening a different root or revoking permissions triggers a new job, replacing the old cache.

Because all cached data stays in memory and is scoped per-folder session, the index never survives a page reload. This keeps storage predictable and avoids stale results if the underlying filesystem changes outside the session.

