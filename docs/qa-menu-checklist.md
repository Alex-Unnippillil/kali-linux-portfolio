# Menu QA Checklist

This checklist covers manual validation steps for the desktop, taskbar, and app context menus when automated tests do not fully exercise pointer-driven flows. Run it after substantial menu or tooltip changes and before shipping major UI revisions.

## Context menu sweeps

- [ ] Start a production build (`yarn build && yarn start`) and open the desktop at `http://localhost:3000`.
- [ ] With a pointing device, right-click five different empty spots on the desktop to confirm the desktop menu positions itself fully within the viewport and closes on Escape, click-away, and after launching an action (e.g., **Open in Terminal**).
- [ ] Open app context menus for at least five distinct desktop icons via right-click. Verify Pin/Unpin toggles update the dock immediately and close the menu without leaving windows `inert`.
- [ ] Exercise taskbar menu interactions for every running window: right-click, choose **Minimize**, re-open the menu, and choose **Close**. Ensure minimized windows can still be restored from the dock and that closed windows disappear from the taskbar.
- [ ] Trigger each menu near screen edges (bottom-right corner, lower-left, etc.) and confirm the menu auto-repositions on-screen with no overflow scrollbars.

## Keyboard and focus spot-checks

- [ ] From the desktop, use `Shift+F10` to open each context menu type (desktop background, desktop icon, taskbar button). Tab through the entries to confirm focus loops and Escape returns focus to the original control.
- [ ] While a menu is open, verify no background window retains the `inert` attribute in the Elements panel, and that `document.activeElement` resides within the menu.
- [ ] After closing the menu with Escape, ensure the previously focused element regains focus and can be activated with Enter or Space.

## Tooltip behaviour

- [ ] Hover over each dock shortcut and confirm the preview thumbnail and label appear with `visible` class, then disappear (`invisible`) after moving the pointer away or shifting keyboard focus.
- [ ] Focus the dock shortcut and the status area with the keyboard (Tab/Shift+Tab) to verify no tooltip remains visible while navigating with keys.
- [ ] Confirm tooltips never overlap or obscure an open context menu, especially when both are triggered rapidly.

Document the date, browser, and any anomalies in `test-log.md` for future regressions.
