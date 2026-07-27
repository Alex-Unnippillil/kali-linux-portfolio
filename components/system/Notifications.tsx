import type { FC, ReactNode } from 'react';
import { useContext, useEffect, useMemo, useRef } from 'react';
import NotificationCenter, {
  NotificationsContext,
} from '../common/NotificationCenter';

export const NOTIFICATION_COUNTS_EVENT = 'notifications:counts';

export interface NotificationCountsDetail {
  counts: Record<string, number>;
  total: number;
}

declare global {
  interface Window {
    __kaliNotificationCounts?: NotificationCountsDetail;
  }
}

const NotificationCountsEmitter: FC = () => {
  const ctx = useContext(NotificationsContext);
  const signatureRef = useRef<string | null>(null);
  const notifications = ctx?.notifications ?? {};

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [appId, list] of Object.entries(notifications)) {
      if (Array.isArray(list) && list.length > 0) {
        result[appId] = list.length;
      }
    }
    return result;
  }, [notifications]);

  const total = useMemo(
    () => Object.values(counts).reduce((sum, value) => sum + value, 0),
    [counts],
  );

  useEffect(() => {
    if (!ctx || typeof window === 'undefined') return;
    const detail: NotificationCountsDetail = { counts, total };
    const signature = JSON.stringify(detail);
    if (signatureRef.current === signature) return;
    signatureRef.current = signature;
    window.__kaliNotificationCounts = detail;
    window.dispatchEvent(
      new CustomEvent<NotificationCountsDetail>(NOTIFICATION_COUNTS_EVENT, {
        detail,
      }),
    );
  }, [ctx, counts, total]);

  return null;
};

const Notifications: FC<{ children?: ReactNode }> = ({ children }) => (
  <NotificationCenter>
    <NotificationCountsEmitter />
    {children}
  </NotificationCenter>
);

export { NotificationsContext };

export default Notifications;
