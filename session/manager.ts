import { useCallback } from 'react';
import useNotifications from '../hooks/useNotifications';
import { getDoNotDisturb } from '../utils/notificationSettings';

/**
 * Hook returning utilities for working with desktop sessions.
 * Emits toast notifications through the central NotificationCenter
 * while respecting the user's Do Not Disturb preference.
 */
export default function useSessionManager() {
  const { pushNotification } = useNotifications();

  /**
   * Notify the user that windows are being restored.
   * The message is suppressed when Do Not Disturb is enabled.
   *
   * @param count Number of windows that will be restored.
   */
  const notifyRestore = useCallback(
    (count: number) => {
      if (getDoNotDisturb()) return;
      pushNotification('session', `Restoring ${count} windows`);
    },
    [pushNotification],
  );

  return { notifyRestore };
}
