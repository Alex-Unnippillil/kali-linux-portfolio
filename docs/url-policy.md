# URL policy

The portfolio renders a mix of user-provided data, static copy, and demo content. To guard against malicious links we centralize
validation logic in [`utils/urlPolicy.ts`](../utils/urlPolicy.ts).

## Allowed protocols

Only the following protocols are permitted:

- `http:`
- `https:`
- `mailto:`
- `tel:`
- Relative paths (`/foo`, `./bar`, `#anchor`)

All other schemes (`javascript:`, `data:`, `file:`, etc.) are rejected during sanitization.

## Adding a new protocol

1. Update `ALLOWED_PROTOCOLS` in [`utils/urlPolicy.ts`](../utils/urlPolicy.ts). Make sure you understand the security
   implications of the protocol—many schemes execute code or expose local files.
2. Extend the automated tests in [`__tests__/urlPolicy.test.ts`](../__tests__/urlPolicy.test.ts) to cover the new
   protocol. Include both acceptance and rejection cases so regressions are caught.
3. Review any UI components that render URLs. Every consumer should go through `sanitizeUrl` so the new protocol is
   recognized automatically. If a component needs special handling (for example `tel:` links that should not open in a new
   tab) encapsulate that logic in the component rather than bypassing the sanitizer.
4. Document the change in any relevant feature guides so future contributors know the protocol is supported.

## Rendering guidelines

- Always call `sanitizeUrl` before assigning an `href` to `<a>` tags or passing a URL to `window.open`.
- Use `computeRelAttribute` for external links to ensure `rel="noopener noreferrer"` is present without duplicating
  tokens.
- If `sanitizeUrl` returns `null`, render a clear fallback (`Link unavailable`) so the UI remains accessible and does not
  silently drop content.
