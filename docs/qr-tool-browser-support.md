# QR Tool Browser Support

The QR Tool relies on modern media APIs for live scanning and canvas rendering for exports. Use this matrix when validating builds across browsers.

## Live Camera Scanning

| Capability | Chromium (Chrome/Edge/Opera) | Firefox | Safari (macOS/iOS) |
| --- | --- | --- | --- |
| `navigator.mediaDevices.getUserMedia` | ✅ – required for camera preview | ✅ – supported since Firefox 52 on secure origins | ✅ – supported on Safari 11+, requires HTTPS and a user gesture |
| Camera enumeration (`enumerateDevices`) | ✅ – labels available after permission grant | ✅ – labels available after permission grant | ✅ – labels surface once permission granted |
| Torch control (`MediaTrackCapabilities.torch`) | ✅ – supported on mobile devices with flash | ⚠️ – not exposed | ⚠️ – not exposed |
| Built-in `BarcodeDetector` | ✅ – Chromium 83+ | ❌ – fallback to ZXing library | ❌ – fallback to ZXing library |

> **Note:** All camera features require running the app over HTTPS (or `localhost`) due to browser security policies.

## QR Code Exports

| Export | Support Notes |
| --- | --- |
| PNG / JPEG | Uses `HTMLCanvasElement.toDataURL` and works in evergreen browsers. Older browsers without canvas export fall back to manual screenshotting. |
| SVG | Generated via the `qrcode` library and works wherever XML downloads are allowed. |
| PDF | Uses `jsPDF` to embed the canvas image; supported on Chromium, Firefox, and Safari 11+. |

## Fallback Paths

- When camera access is denied or unavailable, users can switch to the **Scan** tab and drag-and-drop QR images for decoding.
- Browsers without `BarcodeDetector` automatically load the ZXing worker, ensuring decoding still works after permission is granted.
- Torch controls are disabled when the active track does not expose `torch` capabilities.

## QA Checklist

1. Confirm permission prompts appear with clear messaging and that denying access surfaces the fallback guidance.
2. Verify camera selector lists all attached cameras after granting permission.
3. Ensure PNG, JPEG, SVG, and PDF downloads trigger and produce readable codes.
4. On Safari and Firefox, confirm the ZXing fallback activates (no console errors, successful scans).
5. On mobile devices, test both portrait and landscape orientations to confirm the preview resizes correctly.
