# Keyboard shortcuts

The desktop shell exposes a handful of global shortcuts that mirror a Linux workstation. These bindings are handled by the centralized shortcut manager in `hooks/useGlobalShortcuts.ts`.

## Global shell shortcuts

| Shortcut | Action |
| --- | --- |
| `Alt` + `Tab` / `Alt` + `Shift` + `Tab` | Open the window switcher and move forward/backward through open apps. Keep holding `Alt` to keep the switcher visible. |
| `Win` / `Meta` key | Toggle the applications overview (the All Apps grid). |
| `Ctrl` + `` ` `` | Summon the Terminal window. The shortcut restores the window if it is minimized or opens a new session if it is closed. |
| `Alt` + `` ` `` | Cycle windows that belong to the same app family (for example, different terminals). |
| `Meta` + Arrow keys | Send directional snap/maximize commands to the focused window. |
| `Ctrl` + `Shift` + `V` | Open the clipboard manager.

## Context-aware behaviour

The shortcut manager is aware of focused inputs:

- When an editable control (`input`, `textarea`, or content editable element) has focus, all global shortcuts **except** `Alt` + `Tab` are suppressed.
- To opt back into global shortcuts for a specific input (for example, a command palette), wrap it in an element with `data-allow-global-shortcuts="true"`.

## Cancelling or disabling shortcuts

Applications can opt out of a shortcut in two ways:

- Listen for the cancellable `global-shortcuts:before-handle` event and call `event.preventDefault()` when you need to consume the key sequence yourself.
- Temporarily disable all global shortcuts by calling `disableGlobalShortcuts(token)` and later `enableGlobalShortcuts(token)` from `hooks/useGlobalShortcuts`. The optional `token` lets multiple features coordinate their overrides.

Both approaches provide an escape hatch for app-level accelerators without breaking the desktop experience.
