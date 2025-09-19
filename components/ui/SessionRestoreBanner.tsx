import React from 'react';

interface SessionRestoreBannerProps {
  updatedAt?: number;
  onRestore: () => void;
  onDismiss: () => void;
}

const formatRelativeTime = (timestamp?: number): string | null => {
  if (!timestamp) return null;
  const diff = Math.max(Date.now() - timestamp, 0);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'moments ago';
  if (diff < hour) {
    const minutes = Math.round(diff / minute);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (diff < day) {
    const hours = Math.round(diff / hour);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.round(diff / day);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

export default function SessionRestoreBanner({
  updatedAt,
  onRestore,
  onDismiss,
}: SessionRestoreBannerProps) {
  const relative = formatRelativeTime(updatedAt);
  const detail = relative
    ? `We found windows from your last visit (${relative}).`
    : 'We found windows from your last visit.';

  return (
    <div
      className="bg-amber-100 text-amber-900 p-3 rounded shadow flex flex-col sm:flex-row sm:items-center gap-3"
      role="alert"
    >
      <div className="flex-1 text-sm">
        <p className="font-semibold text-base">Restore session?</p>
        <p>{detail} Restore them or start a new session.</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRestore}
          className="px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          Restore
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="px-3 py-1 rounded border border-amber-600 text-amber-900 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          Start fresh
        </button>
      </div>
    </div>
  );
}

