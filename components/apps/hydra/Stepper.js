import React, { useEffect, useMemo, useRef, useState } from 'react';
import { calculateDelayMs, defaultThrottleConfig } from './ThrottlePanel';

const Stepper = ({
  active,
  totalAttempts,
  backoffThreshold = 5,
  lockoutThreshold = 10,
  throttleConfig,
  runId,
  initialAttempt = 0,
  onAttemptChange = () => {},
}) => {
  const effectiveConfig = useMemo(() => {
    const base = { ...defaultThrottleConfig, ...(throttleConfig || {}) };
    if (throttleConfig?.throttleAfter === undefined && backoffThreshold !== undefined) {
      base.throttleAfter = backoffThreshold;
    }
    if (throttleConfig?.lockoutAfter === undefined && lockoutThreshold !== undefined) {
      base.lockoutAfter = lockoutThreshold;
    }
    return base;
  }, [throttleConfig, backoffThreshold, lockoutThreshold]);

  const lockoutLimit = effectiveConfig.lockoutAfter;
  const [attempt, setAttempt] = useState(initialAttempt);
  const [locked, setLocked] = useState(initialAttempt >= lockoutLimit);
  const initialDelay = calculateDelayMs(
    Math.max(initialAttempt + 1, 2),
    effectiveConfig
  );
  const [delayMs, setDelayMs] = useState(
    initialDelay || effectiveConfig.baseDelayMs
  );
  const timerRef = useRef(null);
  const delayRef = useRef(initialDelay || effectiveConfig.baseDelayMs);

  useEffect(() => {
    setAttempt(initialAttempt);
    setLocked(initialAttempt >= lockoutLimit);
    const resetDelay = calculateDelayMs(
      Math.max(initialAttempt + 1, 2),
      effectiveConfig
    );
    delayRef.current = resetDelay || effectiveConfig.baseDelayMs;
    setDelayMs(delayRef.current);
    onAttemptChange(initialAttempt);
    // onAttemptChange is stable enough for this use
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, initialAttempt, lockoutLimit, effectiveConfig]);

  useEffect(() => {
    if (!active || locked) return;

    const nextDelay = calculateDelayMs(
      Math.max(initialAttempt + 1, 2),
      effectiveConfig
    );
    delayRef.current = nextDelay || effectiveConfig.baseDelayMs;
    setDelayMs(delayRef.current);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      const final = Math.min(lockoutLimit, totalAttempts);
      setAttempt(final);
      setDelayMs(0);
      delayRef.current = 0;
      if (final >= lockoutLimit) {
        setLocked(true);
      }
      return;
    }

    const tick = () => {
      requestAnimationFrame(() => {
        setAttempt((prev) => {
          const next = prev + 1;
          const final = Math.min(next, lockoutLimit, totalAttempts);
          onAttemptChange(final);
          if (final >= lockoutLimit || final >= totalAttempts) {
            if (final >= lockoutLimit) {
              setLocked(true);
            }
            setDelayMs(0);
            delayRef.current = 0;
            return final;
          }
          const upcomingDelay = calculateDelayMs(
            Math.max(final + 1, 2),
            effectiveConfig
          );
          delayRef.current = upcomingDelay || effectiveConfig.baseDelayMs;
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
    effectiveConfig,
    lockoutLimit,
    totalAttempts,
    runId,
    locked,
    onAttemptChange,
    initialAttempt,
  ]);

  return (
    <div className="mt-4">
      <div className="flex space-x-1" aria-hidden="true">
        {Array.from({ length: lockoutLimit }).map((_, i) => (
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
            Attempt {attempt} of {lockoutLimit}
          </div>
          <div className="mt-2 w-full bg-gray-700 h-2 rounded">
            <div
              data-testid="backoff-bar"
              className="bg-yellow-500 h-2 rounded"
              style={{
                width: `${Math.min(
                  100,
                  (delayMs /
                    Math.max(
                      effectiveConfig.maxDelayMs || 1,
                      effectiveConfig.baseDelayMs || 1
                    )) * 100
                )}%`,
              }}
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
