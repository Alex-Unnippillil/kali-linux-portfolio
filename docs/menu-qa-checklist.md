# Menu and Tooltip QA Checklist

Use this checklist when automated coverage is unavailable or a regression touches menu focus, z-index layering, or tooltip logic.

## Desktop and Context Area
- Press **Shift + F10** while the desktop background is focused to open the desktop context menu.
- Navigate with arrow keys to "Settings" and confirm **Enter** launches the Settings app without trapping focus.
- Dismiss the menu with **Escape** and verify no other menu stays visible.

## Desktop Icons
- Tab through desktop shortcuts until a card is focused.
- Press **Shift + F10** to open the app context menu and use arrow keys to traverse menu items.
- Press **Escape** and confirm focus returns to the shortcut and no inert overlays remain.

## Taskbar Buttons
- Use **Alt + Tab** or click a taskbar button, then press **Shift + F10** to open the taskbar menu.
- Toggle between "Minimize" and "Close" using arrow keys and **Enter**, verifying the taskbar re-focuses afterward.

## Tooltip Behaviour
- Focus the system status button in the top bar and ensure the tooltip reflects the current network state.
- Open the Settings window → toggle **Allow Network Requests** off/on and observe the tooltip text updates immediately.
- Move focus away from the status button to confirm the tooltip hides when not focused.

## Layering Spot-Check
- Rapidly open and close menus in succession (desktop, icon, taskbar) to confirm only one menu is visible at a time.
- Inspect the DOM (or use browser devtools) for lingering `[inert]` attributes after closing menus.
