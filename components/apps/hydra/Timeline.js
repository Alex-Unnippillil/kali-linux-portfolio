import React from 'react';

const AttemptTimeline = ({ attempts = [] }) => {
  if (attempts.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-lg">Attempt Timeline</h3>
      <ol className="space-y-1 text-sm">
        {attempts.map((a, i) => {
          const rate =
            typeof a.throughput === 'number' && Number.isFinite(a.throughput)
              ? a.throughput
              : null;
          const attemptNumber = a.attempt ?? i + 1;
          const rateText = rate !== null ? `, ${rate.toFixed(1)} attempts/s` : '';
          return (
            <li key={i} className="font-mono">
              {`${a.time}s - Attempt ${attemptNumber}: ${a.user}/${a.password} (${a.result}${rateText})`}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default AttemptTimeline;
