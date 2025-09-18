# Accessibility Support Matrix

_Last updated: 2025-02-13_

The matrix below captures manual smoke results for the desktop shell, window switcher, and application grid after adding explicit labels and dialog semantics. Focus was placed on keyboard navigation, announcement order, and how custom controls are exposed to assistive technology.

| Screen reader | Browser | Platform | Status | Notes |
| --- | --- | --- | --- | --- |
| NVDA | Firefox 122 | Windows 11 | ✅ Pass | App grid search field is labelled and buttons expose application names. Dialogs announce as expected. |
| NVDA | Chromium 121 | Windows 11 | ✅ Pass | Taskbar toolbar name is announced and listbox navigation is read. |
| VoiceOver | Safari 17 | macOS Sonoma | ✅ Pass | Search fields expose labels; dialog controls are discoverable via rotor. |
| VoiceOver | Chrome 121 | macOS Sonoma | ⚠️ Partial | React Window virtualization hides off-screen items; rotor navigation still reaches visible items. |
| Narrator | Edge 121 | Windows 11 | ✅ Pass | Window switcher dialog announces listbox options and selected state. |

## Screen reader testing checklist

- [x] App grid search input is announced with the "Search applications" label.
- [x] Virtualised app grid exposes each shortcut as a list item with the correct position and total count.
- [x] "All applications" overlay announces as a modal dialog and the grid reads as a labelled list.
- [x] Window switcher announces the dialog title, search field, and the currently highlighted option.
- [x] Taskbar toolbar exposes a programmatic name for running applications.

Document any future regressions or new assistive technology pairings in this file to keep the accessibility baseline current.
