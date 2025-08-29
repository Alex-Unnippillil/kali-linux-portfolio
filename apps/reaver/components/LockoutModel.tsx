'use client';

import React, { useMemo, useState } from 'react';

interface TimelineEvent {
  minute: number;
  text: string;
}

const TOTAL_ATTEMPTS = 100;

const LockoutModel: React.FC = () => {
  const [rate, setRate] = useState(10); // attacker attempts per minute
  const [limit, setLimit] = useState(10); // router limit per minute
  const [lockout, setLockout] = useState(5); // lockout duration in minutes

  const timeline = useMemo(() => {
    const events: TimelineEvent[] = [];
    let attempts = 0;
    let minute = 0;
    let lockoutRemaining = 0;

    while (attempts < TOTAL_ATTEMPTS) {
      if (lockoutRemaining > 0) {
        events.push({ minute, text: 'Locked out' });
        lockoutRemaining--;
        minute++;
        continue;
      }

      const allowed = Math.min(rate, TOTAL_ATTEMPTS - attempts);
      const attempted = Math.min(allowed, limit);
      attempts += attempted;
      let text = `${attempted} attempt${attempted === 1 ? '' : 's'}`;
      if (rate > limit && attempted === limit) {
        text += ' (lockout)';
        lockoutRemaining = lockout;
      }
      events.push({ minute, text });
      minute++;
    }

    return events;
  }, [rate, limit, lockout]);

  return (
    <div className="mb-6">
      <h2 className="text-lg mb-2">WPS Lockout Model</h2>
      <div className="space-y-4 mb-4">
        <div className="flex items-center gap-2">
          <label htmlFor="rate" className="text-sm">
            Attempts/min
          </label>
          <input
            id="rate"
            type="range"
            min="1"
            max="100"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full"
          />
          <span className="text-sm w-12 text-right">{rate}</span>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="limit" className="text-sm">
            Limit/min
          </label>
          <input
            id="limit"
            type="range"
            min="1"
            max="100"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-full"
          />
          <span className="text-sm w-12 text-right">{limit}</span>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="lockout" className="text-sm">
            Lockout (min)
          </label>
          <input
            id="lockout"
            type="range"
            min="1"
            max="60"
            value={lockout}
            onChange={(e) => setLockout(Number(e.target.value))}
            className="w-full"
          />
          <span className="text-sm w-12 text-right">{lockout}</span>
        </div>
      </div>
      <div>
        <h3 className="text-md mb-1">Timeline</h3>
        <ol className="list-decimal list-inside text-sm space-y-1">
          {timeline.map((e) => (
            <li key={e.minute}>
              {e.minute}m: {e.text}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default LockoutModel;

