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
  const [delayMs, setDelayMs] = useState(500);
  const timerRef = useRef(null);
  const delayRef = useRef(500);

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
    delayRef.current = delay;
    setDelayMs(delay);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      const final = Math.min(lockoutThreshold, totalAttempts);
      setAttempt(final);
      setDelayMs(0);
      delayRef.current = 0;
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
            setDelayMs(0);
            delayRef.current = 0;
            return final;
          }
          if (next >= backoffThreshold) {
            delayRef.current = Math.min(delayRef.current * 2, 4000);
          }
          setDelayMs(delayRef.current);
          timerRef.current = setTimeout(tick, delayRef.current);
          return next;
        });
      });
    };

    timerRef.current = setTimeout(tick, delayRef.current);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    active,
    backoffThreshold,
    lockoutThreshold,
    totalAttempts,
    runId,
    locked,
    onAttemptChange,
    initialAttempt,
  ]);

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
        <>
          <div className="text-white mt-1">
            Attempt {attempt} of {lockoutThreshold}
          </div>
          <div className="mt-2 w-full bg-gray-700 h-2 rounded">
            <div
              data-testid="backoff-bar"
              className="bg-yellow-500 h-2 rounded"
              style={{ width: `${(delayMs / 4000) * 100}%` }}
            />
          </div>
          <div className="text-xs text-yellow-300 mt-1">
            Delay: {delayMs}ms
          </div>
        </>
      )}
    </div>
  );
};

export default Stepper;
