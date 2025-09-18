import React from 'react';
import { SummaryBundle } from './types';

interface SummaryBundleCardProps {
  bundle: SummaryBundle;
  onDismiss: (id: string) => void;
}

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const SummaryBundleCard: React.FC<SummaryBundleCardProps> = ({ bundle, onDismiss }) => {
  return (
    <article className="rounded-lg border border-white/10 bg-black/40 p-4 text-sm text-ubt-grey">
      <header className="flex items-center justify-between gap-2 text-xs uppercase tracking-wide text-white/70">
        <span>{bundle.appTitle}</span>
        <span>{formatTimestamp(bundle.deliveredAt)}</span>
      </header>
      <div className="mt-2 text-base text-white">
        <strong className="mr-1">{bundle.count}</strong>
        {bundle.count === 1 ? 'update' : 'updates'} queued during focus.
      </div>
      {bundle.latestMessage && (
        <p className="mt-2 text-sm text-ubt-grey">Latest: {bundle.latestMessage}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {bundle.actions.map((action) => (
          <button
            key={action.id}
            onClick={() => action.onSelect()}
            className="rounded bg-white/10 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            {action.label}
          </button>
        ))}
        <button
          onClick={() => onDismiss(bundle.id)}
          className="rounded border border-white/20 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          Mark as read
        </button>
      </div>
    </article>
  );
};

export default SummaryBundleCard;
