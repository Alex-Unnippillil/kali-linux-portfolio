# Evidence Vault Data Model

The Evidence Vault simulator now persists records with a well-defined schema so notes, attachments, and metadata stay consistent across demos and saved sessions. This document describes the structure, storage strategy, and demo fixtures that ship with the catalog.

## Record structure

Each entry in the vault is an `EvidenceRecord` object persisted to IndexedDB under the `evidence-vault.records` key.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Stable identifier generated via `crypto.randomUUID()` when available. |
| `title` | `string` | Analyst-provided headline for the artifact. Defaults to “Untitled evidence” if omitted. |
| `summary` | `string` | Short narrative describing why the artifact matters. |
| `status` | `string` | Workflow indicator (for example `Draft`, `Under Review`, `Containment`). |
| `metadata` | [`EvidenceMetadata`](#metadata) | Source system details, analyst ownership, and classification. |
| `attachments` | [`EvidenceAttachment[]`](#attachments) | Array of notes or files associated with the record. |

### Metadata

| Field | Type | Notes |
| --- | --- | --- |
| `caseId` | `string` | Incident or case identifier. |
| `source` | `string` | Collection source (endpoint name, log pipeline, etc.). |
| `location` | `string` | Physical or logical location where the artifact was collected. |
| `analyst` | `string` | Point-of-contact for follow-up questions. |
| `collectedAt` | `string` (ISO 8601) | Timestamp when the artifact was gathered. |
| `classification` | `string` | Sensitivity label (“Confidential”, “Restricted”, …). |
| `tags` | `string[]` | Hierarchical tags using `/` separators (e.g. `case/IR-2024-001`). Used for sidebar filtering. |

### Attachments

Attachments capture supporting context. Two kinds are currently supported:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Unique per attachment. |
| `kind` | `'note' \| 'file'` | Determines how the attachment is rendered. |
| `title` | `string` | Display title inside the attachment list. |
| `description` | `string` | Optional short blurb. |
| `createdAt` | `string` (ISO 8601) | When the attachment was added. |
| `tags` | `string[]` | Optional tags for the attachment itself. |
| `body` | `string` | **Notes only.** Multi-line text captured via prompts. |
| `fileName` | `string` | **Files only.** Original file name. |
| `mimeType` | `string` | **Files only.** Browser MIME type or `application/octet-stream`. |
| `sizeBytes` | `number` | **Files only.** Size reported by the browser. |
| `downloadUrl` | `string` | **Files only.** Either a bundled `/demo-data/...` path or a Data URL for analyst-uploaded files. |

## Storage

Runtime changes are written to IndexedDB through the `utils/evidenceVaultStorage.ts` helpers. `loadEvidenceRecords()` returns saved data (or `[]` on first launch), while `persistEvidenceRecords()` updates the key after every mutation. When no saved data exists the UI falls back to the bundled fixtures described below.

## Demo fixtures

`public/demo-data/evidence-vault/records.json` contains two sample records with metadata and attachments that illustrate the schema:

```json
[
  {
    "id": "ir-2024-001-memdump",
    "title": "IR-2024-001 Memory Capture",
    "status": "Under Review",
    "metadata": {
      "caseId": "IR-2024-001",
      "classification": "Confidential",
      "tags": ["case/IR-2024-001", "artifact/memory"]
    },
    "attachments": [
      { "kind": "note", "title": "Initial triage notes" },
      {
        "kind": "file",
        "title": "Volatility triage summary",
        "fileName": "memdump-triage.txt",
        "downloadUrl": "/demo-data/evidence-vault/memdump-triage.txt"
      }
    ]
  }
]
```

Additional CSV and text fixtures live alongside the JSON payload so downloads work in static export mode.

## UI alignment

The Evidence Vault window now surfaces:

- Tag sidebar based on `metadata.tags`, including an explicit “All evidence” option and `(untagged)` bucket.
- Record list summarising `title`, `status`, and `summary` for the filtered view.
- Detail pane with `metadata` rendered as a definition list, chip-style tag display, and action buttons for editing or deletion.
- Attachment section that differentiates note content from downloadable files, showing MIME type, size, and download links when available.

CRUD actions (create, edit, delete, add note, add file) are routed through prompt dialogs so analysts can populate the schema without leaving the desktop simulation.
