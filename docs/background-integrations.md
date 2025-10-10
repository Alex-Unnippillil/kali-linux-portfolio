# Background integrations and the notification center

This portfolio ships background workers (service workers, Web Workers, parsers) that often
run outside the React tree. When they detect an update or failure they should surface an
inline notification instead of relying on `console` noise. The `NotificationCenter`
provider now exposes a small API to make this consistent.

## `useNotificationCenter`

The `hooks/useNotifications` module exports `useNotificationCenter`. It is a thin wrapper
around the `NotificationCenter` context and returns helpers such as `pushNotification`,
`clearNotifications`, and `markAllRead`. Render any coordinating component inside the
`<NotificationCenter>` provider and call `useNotificationCenter()` to bridge background
signals into the UI.

```tsx
import { useEffect } from 'react';
import { useNotificationCenter } from '../hooks/useNotifications';

const FileSyncBridge = () => {
  const { pushNotification } = useNotificationCenter();

  useEffect(() => {
    const sync = async () => {
      try {
        await runSync();
        pushNotification({
          appId: 'system://sync',
          title: 'Workspace synced',
          body: 'All project files are up to date.',
        });
      } catch (error) {
        pushNotification({
          appId: 'system://sync',
          title: 'Sync failed',
          body: error instanceof Error ? error.message : 'Check the console for details.',
          priority: 'high',
          hints: { severity: 'error' },
        });
      }
    };

    sync();
  }, [pushNotification]);

  return null;
};
```

## Service worker example

`components/common/ServiceWorkerBridge.tsx` registers the production service worker and
pushes notifications when an update is ready or when registration fails. It also exposes a
`window.manualRefresh()` helper so the desktop shell can request an update on demand.
Use the same pattern for future integrations:

1. Mount a bridge component inside the providers returned by `_app.jsx`.
2. Use `useNotificationCenter()` to publish state to the desktop notification tray.
3. Provide descriptive `appId` values and include hints (such as `severity`) so rule-based
   prioritisation keeps working.
4. Keep `console.error`/`console.warn` statements for debugging, but prefer a concise
   notification for users.

Following this structure keeps background automation discoverable without introducing new
state containers or bespoke toasts.
