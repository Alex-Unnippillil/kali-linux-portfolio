# Firefox macro recorder workflow

The Firefox simulation includes a macro recorder that captures interactions inside the window and replays them with high fidelity. This guide explains how to operate the recorder, how macros are stored, and which interactions are currently unsupported.

## Recording a macro

1. Open the Firefox application and click **Start recording** in the macro recorder panel.
2. Interact with the simulation as usual (type in fields, click links or buttons, submit forms, etc.).
3. When finished, click **Stop**. The captured macro is converted to JSON and displayed in the **Macro JSON** editor.

While recording, the toolbar shows the active status. The recorder automatically tags DOM elements with stable identifiers so that selectors stay consistent between sessions. Events are timestamped relative to the recording start to preserve delays and asynchronous behaviour during playback.

## Exporting and importing macros

- **Export**: Click the **Export** button to copy the JSON macro to the clipboard (if available) and refresh the editor contents.
- **Import**: Paste a previously exported JSON macro into the editor and click **Import**. The recorder validates the payload and loads it for playback.
- **Clear draft**: Clears the editor without affecting the loaded macro, handy when composing or reviewing macros manually.

Macros use the `firefox.macro/1.0.0` version tag. The importer accepts any macro whose namespace matches `firefox.macro` and whose major version is `1`, allowing future backward-compatible revisions. If the version is incompatible, the recorder raises a descriptive error so contributors can migrate the macro safely.

## Replaying macros

1. Ensure a macro is loaded (either by recording or importing one).
2. Click **Replay macro**. The recorder dispatches events in order, preserving the relative timing between interactions. The playback engine waits for elements to appear in the DOM (up to two seconds by default), which lets it handle asynchronous UI such as simulated network responses.
3. After the run, the panel displays the measured fidelity and a success/failure breakdown. Macros that meet or exceed 95% accuracy are highlighted as successful replays.

## Known limitations

- The recorder only observes elements within the Firefox simulation container; it does not capture interactions inside cross-origin iframes because of browser sandboxing rules.
- Drag-and-drop, pointer lock, and multi-touch gestures are not yet captured.
- Clipboard operations are best-effort. When the Clipboard API is unavailable, the recorder keeps the JSON in the editor and reports the limitation instead of failing.
- Extremely dynamic layouts may rename or remove the DOM elements that macros rely on. When that happens, replay fidelity may drop and the panel will report the affected events.

## Testing strategy

Unit tests cover two canonical flows:

1. Recording and replaying standard input and click interactions, ensuring the recorded macro round-trips correctly and achieves at least 95% fidelity.
2. Replaying a macro against UI that mounts asynchronously, validating that the wait logic handles delayed DOM nodes without regressing accuracy.

These tests run under Jest with fake timers for deterministic scheduling and enforce the fidelity guarantees that the recorder advertises.
