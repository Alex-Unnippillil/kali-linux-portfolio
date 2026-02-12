import Image from 'next/image';
import { useId, useMemo } from 'react';
import type { MouseEventHandler } from 'react';

export interface TaskbarItemProps {
  /**
   * Unique application id. Used for context menus and accessibility ids.
   */
  appId?: string;
  /**
   * Alternate identifier. Falls back to the title when `appId` is missing.
   */
  id?: string;
  /**
   * Human readable title displayed in the taskbar.
   */
  title: string;
  /**
   * Path to the icon displayed for the taskbar item.
   */
  icon: string;
  /**
   * Optional alt text for the icon. Defaults to decorative if omitted.
   */
  iconAlt?: string;
  /**
   * Whether the associated window is currently focused.
   */
  isActive?: boolean;
  /**
   * Whether the associated window is minimized.
   */
  isMinimized?: boolean;
  /**
   * Whether to render the regular running indicator.
   */
  showRunningIndicator?: boolean;
  /**
   * When true, show a pulsing dot and announce background work to screen readers.
   */
  hasBackgroundActivity?: boolean;
  /**
   * Custom accessible copy for the background activity announcer.
   */
  backgroundActivityLabel?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onContextMenu?: MouseEventHandler<HTMLButtonElement>;
  onMouseDown?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  /**
   * Optional override for the `data-context` attribute.
   */
  dataContext?: string;
}

const normalizeIconPath = (icon: string) => icon.replace(/^\.\//, '/');

const sanitizeForId = (value: string) => value.replace(/[^A-Za-z0-9_-]/g, '-');

const TaskbarItem = ({
  appId,
  id,
  title,
  icon,
  iconAlt,
  isActive = false,
  isMinimized = false,
  showRunningIndicator = false,
  hasBackgroundActivity = false,
  backgroundActivityLabel,
  onClick,
  onContextMenu,
  onMouseDown,
  className,
  dataContext = 'taskbar',
}: TaskbarItemProps) => {
  const generatedId = useId();
  const resolvedId = appId ?? id ?? generatedId;
  const normalizedIcon = normalizeIconPath(icon);

  const statusMessage = useMemo(() => {
    if (backgroundActivityLabel) {
      return backgroundActivityLabel;
    }

    return hasBackgroundActivity
      ? `${title} has background activity in progress.`
      : `${title} has no background activity.`;
  }, [backgroundActivityLabel, hasBackgroundActivity, title]);

  const ariaLabel = useMemo(() => {
    if (hasBackgroundActivity) {
      return `${title}, background activity in progress`;
    }

    return title;
  }, [hasBackgroundActivity, title]);

  const containerClassName = [
    'relative flex items-center mx-1 px-2 py-1 rounded transition-colors duration-150',
    'hover:bg-white hover:bg-opacity-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'focus-visible:ring-white/80 focus-visible:ring-offset-black/60',
    isActive && !isMinimized ? 'bg-white bg-opacity-20' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const statusId = `${sanitizeForId(resolvedId)}-activity-status`;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-describedby={statusId}
      className={containerClassName}
      data-context={dataContext}
      data-app-id={resolvedId}
      data-active={isActive ? 'true' : 'false'}
      data-minimized={isMinimized ? 'true' : 'false'}
      data-background-activity={hasBackgroundActivity ? 'true' : 'false'}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseDown={onMouseDown}
    >
      <Image
        width={24}
        height={24}
        className="h-5 w-5"
        src={normalizedIcon}
        alt={iconAlt ?? ''}
        aria-hidden={iconAlt ? undefined : 'true'}
      />
      <span className="ml-1 whitespace-nowrap text-sm text-white">{title}</span>

      {showRunningIndicator && !isMinimized && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full bg-white"
        />
      )}

      {hasBackgroundActivity && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center"
        >
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      )}

      <span id={statusId} role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </span>
    </button>
  );
};

export default TaskbarItem;
