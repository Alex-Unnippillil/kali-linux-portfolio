# Screenreader Regression Plan for Window Title Announcements

This checklist covers manual screenreader verification for the desktop window manager. Run through it whenever the window chrome, tabbed layouts, or aria-label wiring changes.

## Environment Preparation

1. Launch the portfolio locally with `yarn dev` and open it in Chromium, Chrome, or Firefox.
2. Enable a screenreader:
   - **NVDA (Windows):** Launch NVDA with default settings.
   - **VoiceOver (macOS):** Press `Command + F5` to toggle VoiceOver.
   - **Narrator (Windows alt):** `Win + Ctrl + Enter` to toggle.
3. Confirm the browser tab has focus before interacting with the virtual desktop.

## Baseline Window Verification

1. Open any application window (for example, the **Terminal** app) from the dock.
2. With the screenreader running, move focus to the new window:
   - Press `Shift + Tab` until the window frame receives focus, or click once on the titlebar then press `Tab`.
3. Listen for the announcement:
   - The reader should announce a dialog with the application name. Example: “Terminal — Session 1, dialog”.
4. Inspect via devtools (optional but recommended):
   - Ensure the focused window container exposes `role="dialog"` and `aria-labelledby` targeting the title element.
   - Confirm no redundant `aria-label` overrides the computed name when `aria-labelledby` is present.

## Tab Title Change Propagation

1. Using the Terminal app (or any tabbed window):
   - Trigger the new tab action (`Ctrl + T` or the **+** button).
   - Switch tabs using keyboard controls (`Ctrl + Tab`, arrow keys, or mouse).
2. After each tab switch, refocus the window frame (`Shift + Tab` or click titlebar) and listen for the announcement.
   - Expect the dialog name to include the active tab (e.g., “Terminal — Session 2, dialog”).
3. Close all additional tabs and ensure the title reverts to the base application name when only one tab remains.

## Minimized and Restored Windows

1. Minimize the window via the titlebar button.
2. Restore it from the dock/taskbar and refocus the frame.
   - The announcement should still reflect the latest active tab title.

## Regression Guardrails

- If any announcement omits the tab title or falls back to “dialog” without a name, capture the DOM snippet and open a defect.
- Validate both NVDA and VoiceOver when possible; differences should be noted in the defect ticket with reproduction details.

## Reporting

For each run, record:

- Screenreader used and version.
- Browser and version.
- Any deviations from expected announcements.
- Screenshots or DOM captures for failures.
