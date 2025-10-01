# Extension Developer Console

The **Extension Developer Console** simulates a browser extension loader so you can iterate on sandboxed
workers or iframe-based integrations without modifying the production catalog. It lives under
`components/extensions/DevConsole.tsx` and expects manifests that mirror the plugin API
(`/api/plugins/*`).

## Developer mode workflow

1. **Enable Developer Mode.** The toggle is intentionally wrapped in a red banner because it executes
   arbitrary code in a sandbox. Never ship a build with Developer Mode enabled.
2. **Choose the manifest source.**
   - **Local path** values resolve through `/api/plugins/<path>` so you can iterate on files inside
     `plugins/catalog`. Example: `catalog/demo.json` loads
     `/api/plugins/catalog/demo.json` and hot-reloads whenever the source file changes.
   - **Remote URL** must be an `https://` manifest that you control. The console polls it with
     `cache: "no-store"` and follows relative `entry` paths inside the manifest.
3. **Hot reload.** The `useSandboxHotReload` hook polls every ~1 second. When the manifest payload or its
   linked entry file changes, the sandbox tears down and restarts automatically, keeping the last 200
   log lines.
4. **Review logs and errors.** Worker messages, iframe `console.*` output, and thrown errors appear in the
   log pane with timestamps. Use **Reload now** for a manual refresh or **Clear logs** to reset the buffer.
5. **Stop watching.** Use **Stop** (or disable Developer Mode) to revoke Blob URLs, terminate workers, and
   clear the sandbox state.

## Manifest expectations

Supported manifest fields:

```jsonc
{
  "id": "custom-tool",            // optional, logged in the reload banner
  "sandbox": "worker",            // "worker" (default) or "iframe"
  "code": "self.postMessage('hi')" // inline JavaScript code
  // OR
  "entry": "./dist/extension.js"   // relative or absolute URL to load code from
}
```

If `entry` is present, the console fetches it relative to the manifest URL. Both manifest and entry
requests run with `cache: "no-store"` so updates show up immediately.

## Safety notes

- Developer Mode is **unsafe for production**. The UI states this explicitly, and the toggle is persisted in
  `localStorage` under `extensions:developer-mode`. Builds should ensure the flag is `false`.
- The sandbox only allows scripts to run; no external network access is granted beyond the requested
  manifest or entry URLs.
- Logs are stored in-memory and capped at 200 entries to avoid runaway growth.
- Worker sandboxes override `console.*` calls and surface unhandled errors through `postMessage`. Iframe
  sandboxes render in a Blob URL with `sandbox="allow-scripts"` and capture `console.*` and window errors.

## Manual testing checklist

- [ ] Toggle Developer Mode on/off and verify the warning banner persists across reloads.
- [ ] Load a local manifest and confirm it re-executes after saving the file.
- [ ] Load a remote manifest (mock server) and ensure poll-based reloads work.
- [ ] Trigger a runtime error inside the sandbox and confirm the log pane highlights it.
- [ ] Click **Stop** to revoke the sandbox and clear the watcher.
