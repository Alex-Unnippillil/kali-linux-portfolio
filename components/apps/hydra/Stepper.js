import React, { useEffect, useRef, useState } from 'react';

const Stepper = ({
  active,
  totalAttempts,
  backoffThreshold = 5,
  lockoutThreshold = 10,
  runId,
  initialAttempt = 0,
  onAttemptChange = () => {},
}) => {
  const [attempt, setAttempt] = useState(initialAttempt);
  const [locked, setLocked] = useState(initialAttempt >= lockoutThreshold);
  const timerRef = useRef(null);

  useEffect(() => {
    setAttempt(initialAttempt);
    setLocked(initialAttempt >= lockoutThreshold);
    onAttemptChange(initialAttempt);
    // onAttemptChange is stable enough for this use
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, initialAttempt, lockoutThreshold]);

  useEffect(() => {
    if (!active || locked) return;

    let delay = 500;
    if (initialAttempt >= backoffThreshold) {
      for (let i = backoffThreshold; i < initialAttempt; i++) {
        delay = Math.min(delay * 2, 4000);
      }
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      const final = Math.min(lockoutThreshold, totalAttempts);
      setAttempt(final);
      if (final >= lockoutThreshold) {
        setLocked(true);
      }
      return;
    }

    const tick = () => {
      requestAnimationFrame(() => {
        setAttempt((prev) => {
          const next = prev + 1;
          const final = Math.min(next, lockoutThreshold, totalAttempts);
          onAttemptChange(final);
          if (final >= lockoutThreshold || final >= totalAttempts) {
            if (final >= lockoutThreshold) {
              setLocked(true);
            }
            return final;
          }
          if (next >= backoffThreshold) {
            delay = Math.min(delay * 2, 4000);
          }
          timerRef.current = setTimeout(tick, delay);
          return next;
        });
      });
    };

    timerRef.current = setTimeout(tick, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [active, backoffThreshold, lockoutThreshold, totalAttempts, runId, locked, onAttemptChange]);

  return (
    <div className="mt-4">
      <div className="flex space-x-1" aria-hidden="true">
        {Array.from({ length: lockoutThreshold }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded ${
              i < attempt ? 'bg-green-400' : 'bg-gray-500'
            }`}
          />
        ))}
      </div>
      {locked ? (
        <div className="text-red-400 mt-1">Locked out</div>
      ) : (
        <div className="text-white mt-1">
          Attempt {attempt} of {lockoutThreshold}
        </div>
      )}
    </div>
  );
};

export default Stepper;
