# Window Manager Debugging

The desktop window manager includes a debug overlay that helps visualize snap targets and window state while you are iterating on drag interactions.

## Enabling the overlay

You can enable the overlay with either of the following options:

- Set the environment variable before starting the dev server:
  
  ```bash
  NEXT_PUBLIC_WINDOW_DEBUG=1 yarn dev
  ```
- Append `?snap-debug=1` to the URL while the app is running.

Once enabled, the overlay renders colored regions for the available snap targets and a HUD showing the current cursor coordinates and snap state.

## Runtime toggle

While the app is running you can press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd> (or <kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd> on macOS) to toggle the overlay on or off without reloading the page.

Use this tool when tuning drag thresholds or investigating snap behaviors. Remember to disable the flag before shipping production builds.
