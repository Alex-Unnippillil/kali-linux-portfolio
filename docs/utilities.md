# Utilities

Common helper utilities for apps and libraries are centralized in `lib/utilities`.

## Modules

- **fileGuards.ts** – basic size and MIME type checks for uploaded files.
- **streamingParser.ts** – parse newline-delimited JSON streams via async
  iteration.
- **workerWrapper.ts** – promise-based wrapper around Web Workers or compatible
  interfaces.
- **fetchWithRetry.ts** – `fetch` with timeout and retry semantics.
- **useToastLogger.ts** – React hook combining console logging with a simple
  toast message state.

These helpers aim to reduce duplicated code across apps. Refer to
`components/apps/utilities-demo.tsx` for example usage.
