# Trace Recorder

The Trace Recorder lives inside the **Resource Monitor** app. Open the app from the desktop launcher and use the new **Trace Recorder** tab to capture performance events and share them with other developers.

## Workflow

1. Toggle to the **Trace Recorder** tab.
2. (Optional) Decide whether to keep the default **Sanitize personal data** setting. Sanitization is on by default and cannot be changed while a capture is running.
3. Select **Start capture**. The recorder subscribes to `PerformanceObserver` entry types supported by the current browser and begins tracking error and rejection events.
4. Allow the session to run. The status area shows elapsed time, event count, and the running export size. Sessions auto-stop after 30 seconds or when the export would exceed 5 MB.
5. Press **Stop capture** (or wait for the auto-stop) to finalize the trace. Metadata such as session ID, locale, timezone, viewport, and device category are captured alongside the events.
6. Download the JSON file or use the Share button. The export includes a `traceEvents` array compatible with Chromium/Perfetto viewers and embeds the detailed event payload under `args`.

## Capture details

- **Event sources.** Performance entries (`navigation`, `resource`, `mark`, `measure`, `paint`, `longtask`) plus runtime `error` and `unhandledrejection` events are tracked while the recorder is active. When `PerformanceObserver` is not available, the recorder falls back to a snapshot taken when the session stops.
- **Sanitization.** With sanitization enabled, URLs lose query strings, long numeric sequences, IPs, and email addresses are redacted, and metadata only reports coarse-grained values (e.g., locale language code and device category). Disable sanitization before starting a session if you need raw values for debugging.
- **Size guard.** The recorder measures the serialized `traceEvents` payload (plus metadata) on every append and stops before the 5 MB ceiling is crossed. The export card displays the exact file size after serialization.
- **Sharing.** The Share button uses the Web Share API when available (including Level 2 file sharing). When not available, the recorder copies the JSON to the clipboard as a fallback.

## Viewer compatibility

The exported JSON follows this structure:

```json
{
  "metadata": { "sessionId": "trace-abcd12", "sanitized": true, ... },
  "traceEvents": [
    { "name": "resource", "cat": "performance", "ph": "X", "ts": 1250, "dur": 340, "args": { ... } },
    { "name": "error", "cat": "error", "ph": "i", "ts": 2310, "args": { "message": "..." } }
  ],
  "displayTimeUnit": "ms"
}
```

Load the file directly in `chrome://tracing`, Perfetto UI, or any trace viewer that accepts Chromium-format trace files. The `args` object exposes the same sanitized detail used inside the in-app event preview, so debugging context is preserved without exposing personal data.
