import React, { useEffect, useRef, useState } from 'react';

const Stepper = ({
  active,
  totalAttempts,
  backoffThreshold = 5,
  lockoutThreshold = 10,
  runId,
}) => {
  const [attempt, setAttempt] = useState(0);
  const [locked, setLocked] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setAttempt(0);
    setLocked(false);
  }, [runId]);

  useEffect(() => {
    if (!active || locked) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let delay = prefersReducedMotion ? 0 : 500;

    const tick = () => {
      requestAnimationFrame(() => {
        setAttempt((prev) => {
          const next = prev + 1;
          const final = Math.min(next, lockoutThreshold, totalAttempts);
          if (final >= lockoutThreshold || final >= totalAttempts) {
            if (final >= lockoutThreshold) {
              setLocked(true);
            }
            return final;
          }
          if (!prefersReducedMotion && next >= backoffThreshold) {
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
  }, [active, backoffThreshold, lockoutThreshold, totalAttempts, runId, locked]);

  return (
    <div className="mt-4">
      <div className="flex space-x-1" aria-hidden="true">
        {Array.from({ length: lockoutThreshold }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded ${
              i < attempt ? 'bg-green-400' : 'bg-gray-600'
            }`}
          />
        ))}
      </div>
      <div className="sr-only" aria-live="polite">
        {locked ? 'Locked out' : `Attempt ${attempt} of ${lockoutThreshold}`}
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
