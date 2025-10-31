# Notification badging manual test guide

This guide explains how to verify the notification bell and Quick Settings badge integration across browsers.

## Supported platforms (Chromium with the Badging API)

> Recommended: Chrome or Edge on desktop with the site installed as a PWA — the Badging API only resolves when the app is
> installed or running in standalone mode.

1. Launch the portfolio in a Chromium browser that supports the Badging API and install it as a PWA if prompted.
2. Open DevTools and run the following snippet to seed demo notifications:

   ```js
   window.__kaliNotifications?.pushNotification({
     appId: 'qa-suite',
     title: 'Badge smoke test',
     body: 'Generated via manual QA script.',
   });
   window.__kaliNotifications?.pushNotification({
     appId: 'qa-suite',
     title: 'Follow-up alert',
     priority: 'high',
   });
   ```

3. Confirm the dock bell updates with the unread count and the Quick Settings status row reads `Notifications: <count> pending`.
4. Toggle **Focus mode** in Quick Settings and confirm the bell badge clears immediately while the status changes to `Muted`.
5. Disable Focus mode. Without opening the bell, verify the unread badge reappears.
6. Open the notification bell popover. The badge should clear as soon as the panel opens, and each seeded alert should be
   marked as read.
7. Click **Dismiss all** and confirm both the badge and the Quick Settings status reset to `All clear`.

## Fallback behaviour (non-Badging browsers)

Test in Firefox, Safari, or any platform that omits `navigator.setAppBadge`.

1. Inject notifications with the same DevTools snippet used above.
2. The notification bell still shows the unread chip, but no system-level app badge should appear.
3. Quick Settings should surface `Badge unsupported` (or `pending (no badge)` when unread notifications exist) so the limitation
   is visible to the user.
4. Opening the notification bell should continue to clear the in-app count even though the OS badge was never displayed.

Document any deviations in the test log, including browser version and whether the site was running as an installed PWA or a
regular tab.
