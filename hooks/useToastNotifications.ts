"use client";

import { useCallback, useContext, useEffect, useState } from 'react';
import {
  NotificationsContext,
  NotificationPriority,
  NotificationHints,
  NotificationMutingReason,
} from '../components/common/NotificationCenter';

export interface ToastPayload {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

export interface UseToastNotificationsConfig {
  appId: string;
  notificationTitle?: string;
  priority?: NotificationPriority;
  hints?: NotificationHints;
}

export interface ShowToastOptions {
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
  priority?: NotificationPriority;
  notificationTitle?: string;
  hints?: NotificationHints;
  body?: string;
  appId?: string;
}

export interface ShowToastResult {
  muted: boolean;
  reason: NotificationMutingReason;
}

const createToastId = () => `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useToastNotifications = ({
  appId,
  notificationTitle,
  priority: defaultPriority,
  hints: defaultHints,
}: UseToastNotificationsConfig) => {
  const context = useContext(NotificationsContext);
  const pushNotification = context?.pushNotification;
  const notificationsMuted = context?.notificationsMuted ?? false;
  const mutingReason = context?.mutingReason ?? null;

  const [toast, setToast] = useState<ToastPayload | null>(null);

  useEffect(() => {
    if (notificationsMuted && toast) {
      setToast(null);
    }
  }, [notificationsMuted, toast]);

  const showToast = useCallback(
    (message: string, options?: ShowToastOptions): ShowToastResult => {
      if (notificationsMuted) {
        const reasonLabel =
          mutingReason === 'both'
            ? 'Do Not Disturb & quiet hours'
            : mutingReason === 'do-not-disturb'
              ? 'Do Not Disturb'
              : mutingReason === 'quiet-hours'
                ? 'quiet hours'
                : 'notification preferences';
        const mergedHints: NotificationHints | undefined = (() => {
          const base = { ...(defaultHints ?? {}) } as NotificationHints;
          const override = options?.hints ?? {};
          const combined: NotificationHints = { ...base, ...override };
          combined['x-kali-muted'] = true;
          if (mutingReason) {
            combined['x-kali-muted-reason'] = mutingReason;
          }
          return combined;
        })();

        pushNotification?.({
          appId: options?.appId ?? appId,
          title: options?.notificationTitle ?? notificationTitle ?? 'Notification silenced',
          body:
            options?.body ??
            `${message}${reasonLabel ? ` (muted by ${reasonLabel})` : ''}`,
          priority: options?.priority ?? defaultPriority ?? 'normal',
          hints: mergedHints,
        });

        return { muted: true, reason: mutingReason };
      }

      setToast({
        id: createToastId(),
        message,
        actionLabel: options?.actionLabel,
        onAction: options?.onAction,
        duration: options?.duration,
      });

      return { muted: false, reason: null };
    },
    [appId, defaultHints, defaultPriority, mutingReason, notificationTitle, notificationsMuted, pushNotification],
  );

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  return { toast, showToast, dismissToast };
};

export default useToastNotifications;
