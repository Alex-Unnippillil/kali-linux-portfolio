# Settings data portability

The Settings app now supports exporting and importing all desktop preferences. This section documents the flow and the JSON payload that is produced.

## Export format

Exports generate a JSON document with version metadata and the complete preference payload. Example:

```json
{
  "version": 1,
  "exportedAt": "2024-05-01T12:34:56.000Z",
  "data": {
    "accent": "#1793d1",
    "wallpaper": "wall-2",
    "useKaliWallpaper": false,
    "density": "regular",
    "reducedMotion": false,
    "fontScale": 1,
    "highContrast": false,
    "largeHitAreas": false,
    "pongSpin": true,
    "allowNetwork": false,
    "haptics": true,
    "theme": "default"
  }
}
```

The file always includes every supported preference. Future versions can add new keys inside `data` while keeping the version at `1`.

## Import safeguards

* Imports are validated with a Zod schema before any state is touched. Invalid files surface an alert instead of mutating storage.
* If the incoming data differs from the current settings, the UI asks for confirmation before overwriting the desktop configuration.
* After a successful import the Settings UI synchronises its React state so toggles, sliders, and wallpaper previews match the stored values immediately.

## Usage tips

1. Export settings from the **Privacy** tab via the “Export Settings” button. The download is named `settings.json` and uses UTF‑8 encoding.
2. Import settings from the same tab. The chooser only accepts JSON files that match the schema above.
3. Resetting the desktop now restores all persisted preferences, including wallpaper choices, accessibility flags, and gameplay toggles such as Pong spin or haptics.

These safeguards are exercised in the smoke suite (`tests/apps.smoke.spec.ts`) which loads the Settings app, switches to the Privacy tab, and verifies that both Import and Export controls are present.
