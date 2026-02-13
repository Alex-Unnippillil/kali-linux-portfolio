# Error taxonomy and boundary guidelines

The desktop shell now exposes a shared error taxonomy so typed errors surface with
contextual recovery hints inside Next.js error boundaries. This page documents
how to throw and handle errors so the global and per-app boundaries can respond
intelligently without forcing a full reload.

## Categories

| Category | When it is used | Preferred constructor |
| --- | --- | --- |
| `network` | Transport failures, offline mode, timeouts, or `fetch`/XHR issues. | `new NetworkError(message, { cause })` |
| `parse` | Data could not be parsed (JSON, XML, binary decoders). | `new ParseError(message, { cause })` |
| `permission` | Browser, OS, or API permission was denied (`NotAllowedError`, HTTP 401/403). | `new PermissionError(message, { cause })` |
| `unknown` | Everything else that does not fall into the above buckets. | `new Error(message)` |

`NetworkError`, `ParseError`, and `PermissionError` live in `lib/error-taxonomy.ts` and
extend the built-in `Error`. They accept the same constructor options so you can
preserve a `cause` for debugging.

## Throwing typed errors

1. Choose the category that best matches the failure so the UI can offer a
   tailored message and action. For example, wrap low-level fetch errors in a
   `NetworkError` before rethrowing them from services.
2. Preserve the original error via the `cause` option when possible:

   ```ts
   try {
     const response = await fetch(url);
     if (!response.ok) {
       throw new NetworkError(`Request failed with status ${response.status}`, { cause: new Error(response.statusText) });
     }
   } catch (error) {
     throw new NetworkError('Unable to reach the API', { cause: error instanceof Error ? error : undefined });
   }
   ```

3. Use `ParseError` for schema/format issues where a retry with fresh data could
   recover.
4. Use `PermissionError` when access is denied or the user must approve a
   capability (camera, filesystem, clipboard, etc.).
5. Fall back to a plain `Error` only when none of the typed categories apply.

## Logging and privacy

Error boundaries send diagnostics via `reportClientError`, which strips query
strings from the URL and records only category, retryability, and lightweight
metadata. Avoid embedding secrets or user content into error messages because
those strings are forwarded for support triage.

## Component guidance

- Boundaries automatically present category-specific actions (`Retry request`,
  `Reset view`, `Retry with permissions`, or `Try again`).
- Recovery buttons call the local `reset` callback to reload the segment without
  refreshing the entire desktop.
- In development, expand the “Debug details” disclosure to view the raw message.

Keep errors typed and descriptive to help support teams triage issues without
collecting sensitive data from end users.
