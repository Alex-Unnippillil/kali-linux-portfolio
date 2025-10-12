import React from 'react';

const AttemptTimeline = ({ attempts = [] }) => {
  if (attempts.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-lg text-[var(--color-text)]">Attempt Timeline</h3>
      <ol className="space-y-1 text-sm">
        {attempts.map((a, i) => {
          const tone =
            {
              attempt: 'text-kali-terminal',
              throttled: 'text-[var(--game-color-warning)]',
              lockout: 'text-[var(--game-color-danger)]',
            }[a.result] || 'text-[var(--color-text)]';
          const emphasis = i === attempts.length - 1 ? 'font-semibold' : '';

          return (
            <li key={i} className={`font-mono ${tone} ${emphasis}`}>
              {a.time}s - {a.user}/{a.password} ({a.result})
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default AttemptTimeline;
