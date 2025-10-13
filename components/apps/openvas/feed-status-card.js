import React from 'react';
import { formatNumber, formatDate } from '../../../lib/intl';

const FeedStatusCard = () => {
  const feed = {
    source: 'Greenbone Community Feed',
    vtCount: 99564,
    lastUpdate: '2024-02-01',
    docs: 'https://docs.greenbone.net/'
  };
  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-kali-surface-muted/80 p-4 text-white shadow-kali-panel backdrop-blur">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-kali-control">
        VT Feed Status
      </h3>
      <p className="text-sm text-white/80">Source: {feed.source}</p>
      <p className="text-sm text-white/80">VTs: {formatNumber(feed.vtCount)}</p>
      <p className="text-sm text-white/80">Last Update: {formatDate(feed.lastUpdate, { dateStyle: 'medium' })}</p>
      <p className="mt-2 text-xs text-white/60">
        Data based on{' '}
        <a
          href={feed.docs}
          className="text-kali-info underline hover:text-kali-info/80"
          target="_blank"
          rel="noreferrer"
        >
          Greenbone docs
        </a>{' '}
        (canned demo)
      </p>
    </div>
  );
};

export default FeedStatusCard;
