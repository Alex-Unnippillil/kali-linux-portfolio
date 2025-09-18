# Accessibility Focus Management

The desktop shell emulates a traditional operating system, so keyboard users expect focus to return to the control that launched a window or dialog. The focus management utilities in `utils/focusManager.ts` provide a consistent way to capture and restore the triggering element.

## Core expectations

- **Desktop windows** – When an app window opens from the desktop, dock, or taskbar we store the launching element and restore focus to it when the window closes. If that element disappears (for example because the icon was removed) we fall back to the next sensible surface (taskbar button, app icon, or the desktop surface).
- **Launcher** – Opening the “Show Applications” grid records the launcher button. Closing the grid—either by toggling it or by launching an app—returns focus to that button so keyboard users can continue navigating the dock.
- **Settings dialogs and modals** – Any dialog rendered with `components/base/Modal.tsx` or the in-app settings drawer must call `storeFocusTarget` when opening and `restoreFocusTarget` when closing. This ensures the settings toggle regains focus after the user exits the dialog.

## Using the focus manager

```ts
import { storeFocusTarget, restoreFocusTarget } from '../utils/focusManager';

const key = 'window:settings';

// When opening a dialog/window
storeFocusTarget(key, triggerElement);

// When closing it
restoreFocusTarget(key, () => document.querySelector('#fallback-button'));
```

- Always pass a stable key per dialog/window so the stored element can be retrieved later.
- Provide a fallback element whenever possible. The helper is only called if the original trigger is gone.
- Ensure the fallback target is focusable (`tabIndex={-1}` works for non-interactive containers).

Following these rules keeps the experience consistent for screen reader and keyboard-only users and mirrors the expectations of a real desktop environment.
