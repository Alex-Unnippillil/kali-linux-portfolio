# Simon Controls

The Simon arcade app now shares the desktop game scaffolding so every session exposes a consistent control surface:

- **Start** – Seeds a new pattern using the optional seed field and immediately replays the full sequence.
- **Pause / Resume** – Uses the global game toolbar (top right of the window) and the keyboard shortcut from `GameLayout` so players can freeze the board while either listening to the computer or replaying their turn. Resuming restarts playback from the beginning of the current round.
- **Reset** – Clears the current streak, cancels any pending timeouts, and returns the board to the "Press Start" state.
- **Mute / Unmute** – Toggles tone playback and error buzzers while leaving vibration feedback enabled.

These controls are persisted per mode/timing pair. When mute is toggled or a strict-mode run ends, the new best streak is written to `localStorage` so relaunching the app restores the top score banner and the `GameLayout` overlay.
