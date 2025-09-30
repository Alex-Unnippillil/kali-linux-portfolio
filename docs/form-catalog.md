# Form Catalog

This document lists the interactive forms that live under the `pages/` directory
and inside `components/apps/`. It is intended to help future work that moves
client-only submissions to Server Actions while keeping static-export friendly
fallbacks.

## Pages directory

| Route / File | Purpose | Current submission flow |
| --- | --- | --- |
| `pages/dummy-form.tsx` | Demo contact form used in tests and docs. | Client-side `fetch` to `/api/dummy` when server features are enabled. Falls back to a local success state in static export builds. |
| `pages/input-hub.tsx` | Utility hub for keyboard testing. | Local-only processing (no network request). |
| `pages/qr/index.tsx` | Multi-mode QR code generator. | Local generation (no network request). |
| `pages/qr/vcard.tsx` | Generates vCard QR codes. | Local generation (no network request). |

## `components/apps`

| App component | Purpose | Current submission flow |
| --- | --- | --- |
| `contact/index.tsx` | Desktop contact window with attachment uploader. | Client-side `fetch` to `/api/contact`, with a local fallback that copies text/email details when the server is unavailable. |
| `firefox/index.tsx` | Browser mock UI. | Search form submits locally (no external request). |
| `john/index.js` | John the Ripper simulator. | Local simulation (no network request). |
| `nessus/index.js` | Nessus scanner simulator. | Local simulation (no network request). |
| `nikto/index.js` | Nikto scanner simulator. | Local simulation (no network request). |
| `openvas/policy-settings.js` | Policy configuration UI. | Local simulation (no network request). |
| `todoist.js` | Task manager simulator. | Local-only state updates. |
| `wordle.js` | Word game. | Local-only state updates. |
| `x.js` | RSS reader mock. | Local fetch to in-memory feeds. |
| `youtube/index.tsx` | YouTube client mock. | Client requests against public API (already handled elsewhere). |

Only two forms currently post to an internal API endpoint (`/api/dummy` and
`/api/contact`). These are the primary candidates for introducing Server Action
submission with a graceful client-only fallback.

