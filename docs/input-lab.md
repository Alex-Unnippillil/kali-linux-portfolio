# Input Lab Device Coverage

The Input Lab utility exercises browser input APIs so QA can confirm hardware compatibility without leaving the desktop shell.
This page captures the detection logic and fallbacks implemented in `apps/input-lab`.

## Supported Inputs

- **Keyboard** – listens for `keydown` events on the window. Each key press logs the key, code, and modifier state, and the panel
  surfaces the most recent input. If the browser does not expose keyboard events the panel marks the device as unsupported.
- **Mouse / Pointer** – attaches to `pointerdown`/`pointermove` when available, with a `mousedown`/`mousemove` fallback. The panel
  displays the last coordinates captured and flags browsers without pointer or mouse support.
- **Touch** – watches `pointer` events with a `touchstart`/`touchmove` fallback. When touch support is missing the panel presents a
  fallback message so testers understand why telemetry is unavailable.
- **Gamepad** – polls `navigator.getGamepads()` every 500 ms and listens for `gamepadconnected` / `gamepaddisconnected` events.
  The view summarizes connected controllers and button/axis activity, and explicitly states when the API is not exposed.

## Telemetry & Export

All device interactions append to a JSON event log stored in memory. A dedicated export button produces a downloadable JSON file so
runs can be archived or shared with maintainers.

## Validation Strategy

- React Testing Library mocks keyboard, mouse, and gamepad activity to verify that the panels surface live updates and fallback
  messaging.
- Autosave validation for the text sandbox remains in place to ensure form interactions continue to work alongside device
  telemetry.
