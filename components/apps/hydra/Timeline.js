import React, { useEffect, useState } from 'react';

const AttemptTimeline = () => {
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/fixtures/hydra-timeline.json');
        const json = await res.json();
        setAttempts(json);
      } catch {
        // ignore fetch errors in environments without network
      }
    };
    load();
  }, []);

  if (attempts.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h3 className="mb-2 text-lg">Sample Attempt Timeline</h3>
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
