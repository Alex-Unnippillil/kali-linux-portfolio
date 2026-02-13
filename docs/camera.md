# Camera App

## Features
- **Modes:** Photo and Video.
- **Photo tools:** Timer (Off / 3s / 10s), countdown overlay, cancel.
- **Video tools:** Start/stop recording, pause/resume when supported, optional audio.
- **Effects (v1):** None, Noir, Night Vision, VHS, Pixelate, Cyberpunk, Glitch.
- **Capture behavior:** Blob-based captures with object URLs (no base64 state).
- **Device controls:** Camera picker, device hot-swap handling, mirror preview, mirror selfie captures, grid overlay.
- **Capability-aware controls:** Zoom slider and torch toggle only when the active camera exposes support.
- **Storage:** Session gallery + persisted OPFS gallery with delete and “Open in Files”.

## Keyboard shortcuts
- `Space` — Capture photo (Photo mode, while streaming).
- `R` — Start/stop recording (Video mode).
- `Esc` — Cancel countdown, stop recording, or stop camera.

## Privacy
All capture and recording flows are local-only in the browser. The app does not upload photos or videos.

## Browser support notes
- **MediaRecorder:** Required for Video mode.
- **ImageCapture:** Used for photo capture when available; falls back to canvas capture.
- **Torch / Zoom:** Only shown if the active video track capabilities provide them.
- **OPFS:** Persisted saves require `navigator.storage.getDirectory` support.

## OPFS path and filenames
- Folder: `Media/Camera`
- Photos: `IMG_YYYYMMDD_HHMMSS.png`
- Videos: `VID_YYYYMMDD_HHMMSS.webm` (or matching mime extension)

## Troubleshooting by DOMException name
- **NotAllowedError:** Permission denied. Click **Start Camera** and allow browser access.
- **NotFoundError:** No camera available. Connect/enable a camera.
- **NotReadableError:** Camera is busy. Close other camera apps and retry.
- **OverconstrainedError:** Requested settings unsupported. Change source or reset camera controls.
- **AbortError:** Startup interrupted. Retry starting the camera.
