import { useCallback } from 'react';
import type { PushNotificationInput } from './useNotifications';
import useNotifications from './useNotifications';
import { announceLiveRegion } from '../utils/liveRegion';

export interface NotifyInput extends PushNotificationInput {
  native?: boolean;
}

const triggerNativeNotification = async (
  title: string,
  body?: string,
  enabled = true,
): Promise<void> => {
  if (typeof window === 'undefined' || !enabled || !('Notification' in window)) return;

  try {
    const currentPermission = Notification.permission;
    if (currentPermission === 'granted') {
      new Notification(title, { body });
      return;
    }

    if (currentPermission === 'default' && Notification.requestPermission) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    }
  } catch (error) {
    console.warn('Native notification failed', error);
  }
};

export const useNotifier = () => {
  const { pushNotification } = useNotifications();

  const notify = useCallback(
    async (input: NotifyInput): Promise<string> => {
      const id = pushNotification({
        appId: input.appId,
        title: input.title,
        body: input.body,
        priority: input.priority,
        hints: input.hints,
        timestamp: input.timestamp,
      });

      const message = input.body ? `${input.title} ${input.body}` : input.title;
      announceLiveRegion(message);
      await triggerNativeNotification(input.title, input.body, input.native !== false);

      return id;
    },
    [pushNotification],
  );

  return { notify };
};

export default useNotifier;
