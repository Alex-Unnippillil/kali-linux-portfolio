# Screenshot capture workflow

This guide explains how screenshot naming works across the desktop simulation and how teams can customise file names with templates.

## Overview

Screenshots can be captured from any app window or the entire desktop. The capture pipeline lives in `modules/system/screenshotter.ts` and uses [`html2canvas`](https://www.npmjs.com/package/html2canvas) to render DOM nodes into images. After the capture completes the module generates a filename from the active template, sanitises it for all supported file systems, and downloads the image to the user.

Templates are persisted client-side using the `screenshot-template` key in `localStorage`. The Settings app exposes a dedicated screen at `/apps/settings/screenshots` so every teammate can review and adjust the naming convention without touching code.

## Template syntax

Filenames are rendered from the template string stored in `localStorage`. Templates support a small set of variables that are replaced at capture time:

| Token | Description | Example |
| --- | --- | --- |
| `{date}` | Local date in `YYYY-MM-DD` format. | `2024-03-08` |
| `{time}` | Local time in `HH-mm-ss` format. Colons are replaced to stay cross-platform friendly. | `14-37-52` |
| `{app}` | Name or identifier of the app that initiated the capture. | `terminal` |
| `{window}` | Active window title or document name. Falls back to `{app}` when missing. | `Session-root` |
| `{monitor}` | Label or index of the display being captured. | `Display-1` |

Unknown tokens are left verbatim so authors can introduce static text such as prefixes (`audit-{date}`).

## Sanitising rules

Filename safety is handled in `utils/capture/screenshotNames.ts` by the `formatScreenshotName` helper.

* Illegal characters for Windows, macOS and Linux (e.g. `<`, `>`, `:`, `/`, `\\`, `?`, `*`) are replaced with hyphens.
* Control characters and trailing dots/spaces are stripped.
* Repeated separators collapse into a single `-`.
* Reserved DOS names (`CON`, `PRN`, `AUX`, `NUL`, `COM*`, `LPT*`) gain a `-file` suffix so they remain valid on Windows.
* Non-empty output is limited to 180 characters before the extension to leave room for suffixes.

The Settings UI shows a live preview of the next filename and flags any invalid characters that will be substituted automatically. This keeps users aware of sanitising behaviour while avoiding disruptive validation errors.

## Working with the template UI

1. Open the Settings application and navigate to **Screenshot naming** (`/apps/settings/screenshots`).
2. Enter or edit the template in the **Filename template** field. The preview updates immediately using mock data (app `Terminal`, window `root@demo:~`, monitor `Display-1`).
3. Use the **Insert token** controls next to each available variable to append the token to the template without memorising syntax.
4. If you want to restore defaults, select **Reset to default**. This resets the template to `{app}-{date}-{time}` and updates local storage.

All changes persist automatically. The next capture will consume the stored template without further configuration.

## Using the capture helper

To capture a DOM element and download it with the templated filename:

```ts
import captureScreenshot from '@/modules/system/screenshotter';

await captureScreenshot({
  target: document.getElementById('window-terminal'),
  context: {
    app: 'terminal',
    windowTitle: 'root@demo:~',
    monitor: 'Display-1',
  },
  format: 'png',
});
```

* `target` accepts either a DOM node or a selector. If omitted, the entire document is captured.
* `context` fills the template variables. Any omitted values use safe defaults.
* `format` supports `png` (default) or `jpeg`.
* Set `download: false` when you only need the `Blob` payload and will handle the download manually.

The helper returns an object containing the `filename` and `blob`, making it easy to feed captures into custom storage flows.

## Troubleshooting

* **Invalid characters warning** – The Settings UI highlights characters that will be swapped during sanitisation. You can keep them (the capture succeeds) or remove them if you want a cleaner template.
* **Blank captures** – Ensure the target element exists and is visible. `captureScreenshot` throws an error if it cannot resolve the selector.
* **Transparent backgrounds** – Pass `backgroundColor: null` so `html2canvas` preserves transparency rather than painting the default dark backdrop.

With templates in place teams can enforce consistent filenames across labs, demos, and documentation without relying on manual renaming.
