import React, { useMemo } from 'react';
import apps from '../../../apps.config';
import { NotificationAction, SummaryBundle } from './types';

const appLookup = new Map(apps.map(app => [app.id, app]));

interface SummaryBundleCardProps {
  bundle: SummaryBundle;
  onClear?: (bundleId: string) => void;
}

const SummaryBundleCard: React.FC<SummaryBundleCardProps> = ({ bundle, onClear }) => {
  const appMeta = appLookup.get(bundle.appId);
  const title = appMeta?.title ?? bundle.appId;
  const icon = appMeta?.icon;

  const previewMessages = useMemo(() => {
    if (bundle.messages.length <= 3) return bundle.messages;
    return bundle.messages.slice(0, 3);
  }, [bundle.messages]);

  const remaining = bundle.messages.length - previewMessages.length;

  const handleAction = (action: NotificationAction) => {
    action.handler();
    onClear?.(bundle.id);
  };

  return (
    <div className="max-w-sm min-w-[260px] overflow-hidden rounded-md border border-gray-700 bg-black/80 text-white shadow-xl backdrop-blur">
      <div className="flex items-center gap-3 border-b border-gray-700 px-3 py-2">
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" className="h-6 w-6 rounded" />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-700 text-xs uppercase">
            {title.slice(0, 2)}
          </div>
        )}
        <div className="flex-1">
          <div className="text-sm font-medium leading-tight">{title}</div>
          <div className="text-xs text-gray-300">{bundle.count} notifications bundled</div>
        </div>
        <button
          type="button"
          onClick={() => onClear?.(bundle.id)}
          className="rounded px-2 py-1 text-xs font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Dismiss
        </button>
      </div>
      <div className="px-3 py-2 text-sm text-gray-200">
        <ul className="space-y-1">
          {previewMessages.map((message, idx) => (
            <li key={`${bundle.id}-message-${idx}`} className="truncate">
              {message}
            </li>
          ))}
          {remaining > 0 && (
            <li className="text-xs text-gray-400">+{remaining} more</li>
          )}
        </ul>
      </div>
      {bundle.actions.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-gray-700 px-3 py-2">
          {bundle.actions.map(action => (
            <button
              key={action.id}
              type="button"
              onClick={() => handleAction(action)}
              className="rounded bg-blue-600 px-2 py-1 text-xs font-medium transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      <div className="border-t border-gray-700 px-3 py-1 text-[10px] uppercase tracking-wide text-gray-400">
        Delivered {new Date(bundle.releasedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
};

export default SummaryBundleCard;
