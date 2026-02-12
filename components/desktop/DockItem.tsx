import type { FC, MouseEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import useNotifications from '../../hooks/useNotifications';
import {
  NOTIFICATION_COUNTS_EVENT,
  type NotificationCountsDetail,
} from '../system/Notifications';

type DockItemProps = {
  appId: string;
  title: string;
  icon: string;
  isActive?: boolean;
  isRunning?: boolean;
  onOpen?: (appId: string, event: MouseEvent<HTMLButtonElement>) => void;
  onContextMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  disabled?: boolean;
};

type NotificationWindow = Window & {
  __kaliNotificationCounts?: NotificationCountsDetail;
};

const DockItem: FC<DockItemProps> = ({
  appId,
  title,
  icon,
  isActive = false,
  isRunning = false,
  onOpen,
  onContextMenu,
  className,
  disabled = false,
}) => {
  const { clearNotifications } = useNotifications();
  const [badge, setBadge] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const detail = (window as NotificationWindow).__kaliNotificationCounts;
    return detail?.counts?.[appId] ?? 0;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const detail = (window as NotificationWindow).__kaliNotificationCounts;
    if (detail) {
      setBadge(detail.counts?.[appId] ?? 0);
    }
  }, [appId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const custom = event as CustomEvent<NotificationCountsDetail>;
      if (!custom.detail) return;
      const nextCount = custom.detail.counts?.[appId] ?? 0;
      setBadge(nextCount);
    };
    window.addEventListener(
      NOTIFICATION_COUNTS_EVENT,
      handler as EventListener,
    );
    return () => {
      window.removeEventListener(
        NOTIFICATION_COUNTS_EVENT,
        handler as EventListener,
      );
    };
  }, [appId]);

  const wasActive = useRef<boolean>(isActive);
  useEffect(() => {
    if (isActive && !wasActive.current) {
      clearNotifications(appId);
      setBadge(0);
    }
    wasActive.current = isActive;
  }, [appId, clearNotifications, isActive]);

  const handleOpen = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (onOpen) {
      onOpen(appId, event);
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-app', { detail: appId }));
    }
    clearNotifications(appId);
    setBadge(0);
  };

  const iconSrc = useMemo(
    () => (icon.startsWith('./') ? icon.replace('./', '/') : icon),
    [icon],
  );

  const badgeLabel = useMemo(() => {
    if (badge <= 0) return title;
    const suffix = badge === 1 ? 'notification' : 'notifications';
    return `${title} (${badge} unread ${suffix})`;
  }, [badge, title]);

  const badgeDisplay = badge > 99 ? '99+' : badge.toString();

  return (
    <button
      type="button"
      data-app-id={appId}
      onClick={handleOpen}
      onContextMenu={onContextMenu}
      className={clsx(
        'relative flex h-12 w-12 items-center justify-center rounded-lg transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue focus-visible:ring-offset-2 focus-visible:ring-offset-black/60',
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-white/10',
        isActive ? 'bg-white/20' : 'bg-transparent',
        className,
      )}
      aria-label={badgeLabel}
      title={title}
      disabled={disabled}
    >
      <Image
        src={iconSrc}
        alt=""
        width={32}
        height={32}
        className="h-8 w-8"
        draggable={false}
        sizes="32px"
      />
      {badge > 0 && (
        <span
          className="pointer-events-none absolute -top-1 -right-1 min-w-[1.5rem] rounded-full bg-red-500 px-1.5 text-xs font-semibold leading-6 text-white shadow-md"
          aria-hidden="true"
        >
          {badgeDisplay}
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {badge > 0
          ? `${badge} unread ${badge === 1 ? 'notification' : 'notifications'}`
          : 'No unread notifications'}
      </span>
      {isRunning && (
        <span
          className="absolute bottom-1 left-1/2 h-1 w-2 -translate-x-1/2 rounded-full bg-white"
          aria-hidden="true"
        />
      )}
    </button>
  );
};

export default DockItem;
