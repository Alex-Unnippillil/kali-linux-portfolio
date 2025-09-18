# Evidence capture store

This document describes the IndexedDB-backed evidence store that powers the Evidence Vault
applications and any future tooling that needs to retain capture metadata offline.

## Overview

`hooks/useEvidenceStore.ts` exposes a React context (`EvidenceStoreContext`) and hook
(`useEvidenceStore`) that provide CRUD access to evidence captures. The store keeps all data in
IndexedDB via the `utils/safeIDB.ts` helper and mirrors the current state in memory for immediate UI
updates. When IndexedDB is unavailable, the provider gracefully falls back to an in-memory store so
components can still operate during the current session.

## Database schema

- **Database name:** `kali-evidence`
- **Version:** `1`
- **Object store:** `captures`
  - **Key path:** `id`
  - **Indexes:** none (lookups are handled in memory)

Each record in the `captures` store follows the `EvidenceCapture` interface:

| Field        | Type                 | Notes |
| ------------ | -------------------- | ----- |
| `id`         | `string`             | Unique identifier for the capture. Used as the primary key. |
| `type`       | `string`             | Category or capture type (e.g. `screenshot`, `note`). |
| `path`       | `string`             | Local path or handle that points to the captured asset. |
| `hash`       | `string`             | Digest used to detect duplicates or verify integrity. |
| `timestamps` | `Record<string,string>` | Arbitrary timestamp map. `createdAt` and `updatedAt` are guaranteed to exist after sanitization. |
| `tags`       | `string[]`           | Deduplicated list of hierarchical tags (`engagement/host/web`). |
| `target`     | `string?`            | Optional target identifier (hostname, IP, etc.). |
| `ticket`     | `string?`            | Optional ticket or task reference number. |

Incoming data is sanitized before persistence:

- Blank strings are trimmed and dropped.
- Missing timestamps are filled with the operation time (using ISO 8601 strings).
- Duplicate tags are removed.

## Provider responsibilities

`EvidenceStoreProvider` bootstraps the database, loads existing captures, and exposes operations via
the context value:

- `addCapture`, `updateCapture`, `removeCapture`, and `clear` mutate the store and keep the in-memory
  cache in sync.
- `getCapture` retrieves an individual record, reusing the cached value when possible.
- `refresh` reloads the store from IndexedDB.
- `exportEvidence` and `buildExportPayload` produce a deterministic snapshot of the current store.
- `importEvidence` merges or replaces captures from a previously exported payload.

Consumers wrap UI with `EvidenceStoreProvider` and call `useEvidenceStore()` to access these methods.

## Export format

Exports serialize to JSON with the following structure:

```json
{
  "version": 1,
  "exportedAt": "2024-05-13T00:00:00.000Z",
  "captures": [
    {
      "id": "abc123",
      "type": "screenshot",
      "path": "opfs://captures/abc123.png",
      "hash": "sha256:…",
      "timestamps": {
        "createdAt": "2024-05-12T23:59:00.000Z",
        "updatedAt": "2024-05-12T23:59:00.000Z"
      },
      "tags": ["engagement/app"],
      "target": "web01",
      "ticket": "INC-4242"
    }
  ]
}
```

Use `serializeEvidenceExport` for string output and `parseEvidenceExport` to validate imports before
calling `importEvidence`.
