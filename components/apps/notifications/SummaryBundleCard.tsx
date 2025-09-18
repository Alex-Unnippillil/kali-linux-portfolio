import React from 'react';
import { NotificationBundle } from './types';

interface SummaryBundleCardProps {
  bundle: NotificationBundle;
  expanded: boolean;
  onToggle: () => void;
  onDismiss: () => void;
}

const SummaryBundleCard: React.FC<SummaryBundleCardProps> = ({
  bundle,
  expanded,
  onToggle,
  onDismiss,
}) => {
  const count = bundle.notifications.length;
  const preview = bundle.notifications[0]?.message ?? 'No details available';
  const deliveredTime = new Date(bundle.deliveredAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <article className="mt-3 rounded-lg border border-gray-700 bg-black bg-opacity-40">
      <header className="flex items-center justify-between px-4 py-3">
        <div>
          <h3 className="text-sm font-medium text-white">
            {bundle.appId} summary ({count})
          </h3>
          <p className="text-xs text-gray-400">
            Delivered at {deliveredTime} · {preview}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={onToggle}
            className="rounded bg-gray-700 px-3 py-1 text-xs text-white hover:bg-gray-600"
          >
            {expanded ? 'Hide' : 'Review'}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-500"
          >
            Dismiss
          </button>
        </div>
      </header>
      {expanded && (
        <div className="px-4 pb-4">
          <ul className="space-y-2 text-sm text-gray-100">
            {bundle.notifications.map(item => (
              <li key={item.id} className="rounded bg-black bg-opacity-50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span>{item.message}</span>
                  <time className="text-xs text-gray-400">
                    {new Date(item.date).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
                {item.actions && item.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.actions.map(action => (
                      <button
                        key={action.label}
                        type="button"
                        className="text-xs underline"
                        onClick={action.onClick}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
};

export default SummaryBundleCard;
