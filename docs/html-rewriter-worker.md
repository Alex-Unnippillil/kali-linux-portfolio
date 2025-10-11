# HTML Rewriter Worker Notes

The HTML Rewriter app now executes transformations inside a dedicated Web Worker to keep the desktop shell responsive and to sandbox experimental selectors. The worker receives serialized HTML, runs a deterministic pipeline, and posts the rewritten markup plus diagnostic notes back to the UI.

## Supported rule types

The worker accepts the same rule structure that the UI presets use:

- `remove` – deletes elements that match the selector.
- `replaceText` – overwrites the `textContent` of matching nodes.
- `setAttribute` – assigns a literal attribute value.
- `removeAttribute` – strips an attribute from matching nodes.

Rules run sequentially in the order provided. If a selector matches nothing the worker records a diagnostic entry rather than throwing.

## Sandbox limitations

- Only serialized HTML is processed. The worker never mutates the live DOM or evaluates scripts.
- CSS layout, network access, cookies, and other main-thread-only APIs are unavailable; transformations are structural only.
- Large payloads should be avoided — the worker does not stream results and may drop overly large documents to stay within memory bounds.
- Custom JSON must conform to the rule schema above. Unknown properties are ignored to avoid unsafe execution paths.

## Testing

Unit coverage lives in `__tests__/html-rewriter.test.ts` and exercises rule combinations for removals, text replacements, and attribute updates. Add new cases alongside future rule types so the sandbox guarantees remain enforced.
