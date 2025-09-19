# Contributing

## Server-only utilities

This project uses the [`server-only`](https://www.npmjs.com/package/server-only) package to make sure modules that depend on Node APIs are never imported in the browser bundle. Follow these conventions when adding or updating server code:

- Start any new server utility (database clients, file-system helpers, etc.) with `import 'server-only';`. This mirrors the existing patterns in `lib/service-client.ts`, `lib/supabase.ts`, and `lib/analytics-server.ts`.
- Reuse the shared wrappers when possible instead of importing Node modules directly:
  - Supabase: call `getServiceClient()`/`getAnonServerClient()` from `lib/service-client.ts`.
  - File system access: import from `lib/server/fs` rather than `fs`/`fs/promises`.
- If you must introduce a new server-only helper, keep the implementation in `lib/server/` (or another server-only module) and ensure it calls `import 'server-only';` at the top of the file.

These steps help catch accidental client imports during development and keep the browser bundle free of Node dependencies.
