import React from 'react';

const AttemptTimeline = ({ attempts = [] }) => {
  if (attempts.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-lg">Attempt Timeline</h3>
      <ol className="space-y-1 text-sm">
        {attempts.map((a, i) => (
          <li key={i} className="font-mono">
            {a.time}s - {a.user}/{a.password} ({a.result})
          </li>
        ))}
      </ol>
    </div>
  );
};

export default AttemptTimeline;
