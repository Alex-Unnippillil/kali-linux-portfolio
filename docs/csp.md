# Content Security Policy Notes

- The middleware now issues a CSP without `'unsafe-inline'` in the `script-src` directive and injects a per-request nonce via the `x-csp-nonce` header.
- `_document.jsx` propagates that nonce into the DOM so client utilities can read it from `document.documentElement.dataset.cspNonce`.
- All `next/script` usages and dynamically created `<script>` elements read the nonce and apply it before execution, covering:
  - `/pages/_app.jsx`
  - `apps/x/index.tsx` (Twitter widgets)
  - Async loaders inside apps such as YouTube helpers, Spotify, the calculator, Input Hub reCAPTCHA, and the X desktop widget.
- Sandbox helpers that emit HTML (`PluginManager` iframe runner and the BeEF payload preview) mirror the active nonce where available and fall back to `'unsafe-inline'` only when no nonce can be generated (e.g., legacy browsers without `crypto.getRandomValues`).
- Manual validation via `curl http://localhost:3000` under `yarn dev` shows the new CSP header omits `'unsafe-inline'` and includes a `nonce-...` token. No CSP violations were logged in the server output during smoke testing.
