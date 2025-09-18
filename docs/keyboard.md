# Keyboard Shortcuts

The desktop shell exposes a focused set of shortcuts that mirror familiar OS
patterns. All shortcuts are handled by the global shortcut manager so they work
anywhere in the workspace unless explicitly suppressed.

| Shortcut | Effect |
| --- | --- |
| `Alt` + `Tab` | Opens the window switcher overlay. Keep holding `Alt` and press `Tab` to step through the list, then release `Alt` to focus the highlighted window. |
| `Ctrl` + `\`` | Cycles focus across open windows without opening the switcher. Hold `Shift` to move in reverse order. |
| `Win` / `Meta` key | Toggles the **All Applications** overview. Press the key again to dismiss the view. |
| `Meta` + Arrow keys | Sends "Super+Arrow" events to the focused window so it can perform snap and tiling actions. |
| `Ctrl` + `Shift` + `V` | Launches the clipboard manager utility. |

## Context-aware behaviour

Global shortcuts automatically pause while text inputs, textareas, selects, or
content-editable elements have focus. Components that still need to receive the
shortcuts can opt-in by adding `data-allow-global-shortcuts="true"` on the
focused element or one of its ancestors.

If an application needs to cancel a shortcut entirely, listen for the
`global-shortcuts:before-handle` event on `window` and call `event.preventDefault()`.
This escape hatch lets apps run their own shortcut logic without fighting the
desktop shell.
