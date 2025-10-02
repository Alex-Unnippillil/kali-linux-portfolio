import React from 'react';
import type { FormattedNotification } from './primitives';

interface NotificationCardProps {
  notification: FormattedNotification;
  mode: 'center' | 'toast';
  onDismiss?: () => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  mode,
  onDismiss,
}) => {
  const containerClasses =
    mode === 'center'
      ? `border-l-2 px-4 py-3 text-sm text-white ${notification.metadata.accentClass}`
      : 'pointer-events-auto w-full max-w-xs rounded-md border border-white/10 bg-ub-grey/95 p-4 text-sm text-white shadow-xl backdrop-blur';

  const liveRegionProps =
    mode === 'toast'
      ? ({ role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' } as const)
      : {};

  return (
    <article className={containerClasses} {...liveRegionProps}>
      <div className={`flex items-start ${mode === 'toast' ? 'gap-3' : 'justify-between gap-2'}`}>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{notification.title}</p>
          {notification.body && (
            <p className="mt-1 whitespace-pre-line text-xs text-ubt-grey text-opacity-80">
              {notification.body}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${notification.metadata.badgeClass}`}
          title={
            notification.classification.matchedRuleId
              ? `Priority ${notification.metadata.label} (${notification.classification.source}: ${notification.classification.matchedRuleId})`
              : `Priority ${notification.metadata.label}`
          }
        >
          {notification.metadata.label}
        </span>
        {mode === 'toast' && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="ml-1 rounded border border-transparent p-1 text-ubt-grey transition hover:text-white focus:outline-none focus:ring-1 focus:ring-ubb-orange"
            aria-label="Dismiss notification"
          >
            <svg aria-hidden="true" focusable="false" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.65rem] uppercase tracking-wide text-ubt-grey text-opacity-70">
        <span>{notification.appId}</span>
        <time dateTime={notification.formattedTime}>{notification.readableTime}</time>
      </div>
    </article>
  );
};

export default NotificationCard;
