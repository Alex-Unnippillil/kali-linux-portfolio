# Selector Profiling

The selector profiler helps debug slow local-storage and IndexedDB lookups that
hydrate desktop state. It is disabled by default and only runs in development
builds.

## Enable the profiler

1. Update `.env.local`:
   ```env
   NEXT_PUBLIC_ENABLE_STATE_PROFILER=true
   ```
2. Restart `yarn dev` so the new flag is applied.

The profiler is ignored in production builds even when the flag is set.

## Reading the output

- Slow selectors emit warnings in the browser console:
  ```text
  [state-profiler] Selector "settingsStore.getAccent" took 12.4ms (threshold 5ms)
  ```
  Each log includes the selector id, the measured duration, and any metadata (for
  example the storage key that was touched).
- All recorded samples are stored on `window.__STATE_PROFILER__` with helpers to
  inspect and reset the buffer:
  ```js
  window.__STATE_PROFILER__.getEntries(); // recent samples
  window.__STATE_PROFILER__.clear();      // reset the buffer
  ```
  The buffer keeps the latest 200 runs to avoid unbounded growth during long
  sessions.

Use the identifiers to trace slow selectors back to their hook (for example,
`usePersistentState` or `settingsStore`) and spot regressions when new storage
reads are introduced.
