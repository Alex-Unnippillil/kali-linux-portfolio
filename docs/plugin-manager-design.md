# Plugin Manager Design (Draft)

## Purpose

Establish a safe extension surface for the Kali Linux Portfolio desktop that lets maintainers ship sandboxed mini-apps without shipping arbitrary code into the core bundle. The current implementation focuses on a proof-of-concept flow (list, install, run) against local JSON manifests. This draft captures the baseline so we can iterate deliberately.

## Existing Architecture Review

### Catalog API

- `GET /api/plugins` enumerates JSON manifests inside `plugins/catalog/`, exposes `{ id, file }` pairs, and ignores hidden/non-JSON entries.【F:pages/api/plugins/index.js†L1-L15】
- `GET /api/plugins/:name` streams the requested catalog file after verifying the resolved path stays inside the catalog directory, defaulting the `Content-Type` header to JSON for `.json` payloads.【F:pages/api/plugins/[name].js†L1-L24】

### Client App

- The `components/apps/plugin-manager` React client renders a catalog, tracks installed manifests in `localStorage`, and can execute a plugin inside either a Web Worker or sandboxed `<iframe>` depending on the manifest’s `sandbox` field.【F:components/apps/plugin-manager/index.tsx†L1-L119】
- Execution results are buffered for ~10ms, then persisted to `localStorage` as the last run output and can be exported as CSV.【F:components/apps/plugin-manager/index.tsx†L66-L111】

### Desktop Shell Integration

- `apps.config.js` registers the Plugin Manager via `createDynamicApp('plugin-manager', 'Plugin Manager')`, making it available to the launcher, dock, and window system alongside other utilities.【F:apps.config.js†L84-L106】【F:apps.config.js†L820-L857】

## Plugin Metadata Schema (Current)

Source manifests live under `plugins/catalog/*.json` (example: `demo.json`).【F:plugins/catalog/demo.json†L1-L5】 A manifest is inlined JSON with:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `string` | ✅ | Unique identifier used as a key in storage and UI labels.
| `sandbox` | `'worker' \| 'iframe'` | ✅ | Determines whether the plugin loads in a Web Worker or sandboxed iframe.
| `code` | `string` | ✅ | Raw JavaScript source that is injected into the chosen sandbox.

### Derived Data

- Catalog listing objects expose `{ id, file }`, where `file` matches the manifest filename exposed by the API.【F:pages/api/plugins/index.js†L6-L12】
- Installed plugins persist as `{ [id]: PluginManifest }` JSON inside `localStorage` under the `installedPlugins` key.【F:components/apps/plugin-manager/index.tsx†L13-L57】
- Last run data persists as `{ id, output: string[] }` JSON inside `localStorage` under the `lastPluginRun` key.【F:components/apps/plugin-manager/index.tsx†L25-L107】

## Dependency Handling & Security Considerations

1. **Sandbox selection** – The manifest’s `sandbox` field governs isolation. Workers receive code via `Blob` URLs and cannot touch the DOM; iframes receive a CSP that disallows external network access and only whitelisted inline script execution. Both sandboxes are torn down after ~10ms.【F:components/apps/plugin-manager/index.tsx†L66-L107】
2. **Storage** – Installs and run logs live in `localStorage`, so the feature only works client-side. The app defensively parses storage entries to avoid breaking on invalid JSON.【F:components/apps/plugin-manager/index.tsx†L13-L52】
3. **API scope** – Catalog APIs read from disk only; there is no upload endpoint. Path traversal is prevented by verifying the resolved path prefix before reading files.【F:pages/api/plugins/[name].js†L8-L22】
4. **Export** – CSV export is generated entirely client-side from buffered output lines and downloaded via `Blob` URL without server interaction.【F:components/apps/plugin-manager/index.tsx†L108-L119】

## Integration Points with the Desktop Shell

- **Launcher/Dock** – `apps.config.js` entry ensures iconography, shortcuts, and favorites behave like other apps.【F:apps.config.js†L820-L857】
- **Window System** – The component renders within the shared desktop chrome; focus, sizing, and state reuse existing shell mechanics from the dynamic app wrapper (`createDynamicApp`).【F:apps.config.js†L84-L106】
- **Analytics & Settings Hooks** – None today. Future work should ensure telemetry hooks and settings toggles (e.g., enabling external plugin sources) plug into the existing global stores described in the roadmap.

## Proposed Scope for Next Iteration

1. **Manifest Schema Expansion** – Add optional metadata (`name`, `description`, `version`, `permissions`, `minShellVersion`) while keeping backwards compatibility with current `id/sandbox/code` trio.
2. **Dependency Declaration** – Introduce declarative capability flags (e.g., `requires: ['http', 'storage']`) so the shell can warn or block plugins that request unavailable resources.
3. **UI Enhancements** – Replace the current barebones list with cards that surface description, permissions, and trust level. Include “Learn more” links back to this doc.
4. **Lifecycle Management** – Add uninstall, update checks (hash comparison), and execution timeouts with streaming logs for long-running workers.
5. **Integration Hooks** – Surface plugin analytics events when telemetry is enabled; wire settings toggles to globally disable plugin execution or restrict to signed manifests.

## Follow-up Tasks

| # | Task | Owner | Notes |
| --- | --- | --- | --- |
| 1 | Extend manifest TypeScript types and API validation for new metadata fields. | Core maintainers | Ensure `/api/plugins` rejects malformed manifests gracefully. |
| 2 | Build catalog UI cards (design + responsive layout) and add Jest tests for new states. | Core maintainers | Coordinate with desktop theme tokens. |
| 3 | Implement uninstall/update flows with storage migration guardrails. | Core maintainers | Persist version info and maintain change history. |
| 4 | Add analytics + settings integration toggles. | Core maintainers | Respect `NEXT_PUBLIC_ENABLE_ANALYTICS` and lab-mode flags. |
| 5 | Document plugin packaging guide in `docs/` for third-party contributors. | Core maintainers | Outline signing story (even if manual) before enabling uploads. |

> _Status: Draft – pending stakeholder review before implementation._
