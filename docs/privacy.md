# Privacy & Consent Center

The settings app includes a dedicated **Privacy** tab that acts as the consent
center for the desktop experience. It summarises every category of data the UI
stores locally and provides tooling to review or export that information.

## Stored data categories

The export workflow groups persisted data into three high-level sections:

- **Profiles** – device or tool profiles saved via OPFS, such as Bluetooth
  captures from the BLE sensor simulator. Each entry includes its full
  definition (`deviceId`, friendly name, characteristic values) and the byte
  size of the stored JSON file.
- **Sessions** – resumable workflows held in `localStorage` including the
  desktop layout (`desktop-session`) and app specific sessions such as Hydra and
  OpenVAS. Values are parsed back into JSON objects when possible and carry the
  size of the original payload.
- **Flags & preferences** – feature toggles and accessibility settings (reduced
  motion, high contrast, haptics, theme, density, router profiles, etc.). The
  export keeps the raw value alongside its byte footprint so you can gauge how
  much storage each flag consumes.

## Exporting a privacy archive

1. Open **Settings → Privacy**.
2. Press **Export Data Archive**. The button triggers the
   `data-export.worker.ts` worker which gathers each category without blocking
   the UI.
3. Watch the inline status indicator. It reports the current stage
   (profiles/sessions/flags), how many records were bundled, and the cumulative
   byte size for that stage. The message uses `aria-live="polite"` so screen
   readers hear updates automatically.
4. When the worker finishes a JSON archive named
   `kali-portfolio-export-<timestamp>.json` downloads automatically. The
   summary line confirms how many profiles, sessions, and flags were exported
   plus the total archive size.

The worker streams progress messages back to the UI, allowing the consent center
to show real-time feedback and to surface any errors (for example when workers
are unsupported). Every run generates a fresh request identifier so stale
messages from earlier exports are ignored.

## Archive format

The downloaded file is a readable JSON document with this structure:

```json
{
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "totals": {
    "bytes": 1234,
    "counts": {
      "profiles": 2,
      "sessions": 3,
      "flags": 10
    }
  },
  "sections": {
    "profiles": {
      "totalSize": 456,
      "items": [
        { "key": "device-id", "size": 123, "data": { /* profile */ } }
      ]
    },
    "sessions": { /* ... */ },
    "flags": { /* ... */ }
  }
}
```

Each item includes the original serialized value (`raw`), the parsed representation, the
source (`opfs` or `localStorage`), and a `size` property measured in bytes. This
keeps the archive human readable while still providing enough metadata for
troubleshooting or for honouring user data requests.
