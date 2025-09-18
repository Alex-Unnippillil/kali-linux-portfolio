import React from 'react';

const formatStatus = (status) => {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatTime = (time) => {
  if (typeof time === 'number' && Number.isFinite(time)) {
    const formatted = time.toFixed(1);
    return formatted.endsWith('.0')
      ? formatted.slice(0, -2)
      : formatted;
  }
  return time;
};

const valueOrDash = (value) => (value ? value : '—');

const AttemptTimeline = ({ attempts = [] }) => {
  if (attempts.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-lg">Attempt Timeline</h3>
      <ol className="space-y-1 text-sm">
        {attempts.map((a, i) => {
          const status = formatStatus(a.status || a.result);
          const attemptId =
            typeof a.attempt === 'number' && a.attempt > 0
              ? `#${a.attempt} `
              : '';
          return (
            <li
              key={a.timestamp || i}
              className="font-mono text-gray-100"
            >
              {attemptId}
              {formatTime(a.time)}s - {valueOrDash(a.user)}/
              {valueOrDash(a.password)} ({status}
              {a.note ? ` – ${a.note}` : ''})
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default AttemptTimeline;
