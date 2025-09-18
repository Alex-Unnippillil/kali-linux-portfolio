import React, { useEffect, useRef, useState } from 'react';

const MAX_DELAY_MS = 4000;

const computeDelay = (count, baseDelay, threshold) => {
  if (!baseDelay || baseDelay <= 0) {
    return 0;
  }
  if (count < threshold) {
    return baseDelay;
  }
  let delay = baseDelay;
  const over = count - threshold + 1;
  for (let i = 0; i < over; i += 1) {
    delay = Math.min(delay * 2, MAX_DELAY_MS);
  }
  return delay;
};

const computeThroughput = (concurrency, delay, remaining) => {
  if (!delay || delay <= 0) {
    return 0;
  }
  const batchSize = Math.min(concurrency, remaining);
  if (batchSize <= 0) {
    return 0;
  }
  return (batchSize / delay) * 1000;
};

const Stepper = ({
  active,
  totalAttempts,
  backoffThreshold = 5,
  lockoutThreshold = 10,
  runId,
  initialAttempt = 0,
  onAttemptChange = () => {},
  concurrency = 1,
  baseDelayMs = 500,
}) => {
  const initialDelay = computeDelay(initialAttempt, baseDelayMs, backoffThreshold);
  const limit = Math.min(lockoutThreshold, totalAttempts);

  const [attempt, setAttempt] = useState(initialAttempt);
  const [locked, setLocked] = useState(initialAttempt >= lockoutThreshold);
  const [delayMs, setDelayMs] = useState(initialDelay);
  const [throughput, setThroughput] = useState(() =>
    computeThroughput(concurrency, initialDelay, Math.max(0, limit - initialAttempt))
  );

  const timerRef = useRef(null);
  const delayRef = useRef(initialDelay);

  useEffect(() => {
    setAttempt(initialAttempt);
    setLocked(initialAttempt >= lockoutThreshold);
    const delay = computeDelay(initialAttempt, baseDelayMs, backoffThreshold);
    delayRef.current = delay;
    setDelayMs(delay);
    const updatedLimit = Math.min(lockoutThreshold, totalAttempts);
    setThroughput(
      computeThroughput(concurrency, delay, Math.max(0, updatedLimit - initialAttempt))
    );
    // onAttemptChange is stable enough for this use
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    runId,
    initialAttempt,
    lockoutThreshold,
    baseDelayMs,
    backoffThreshold,
    totalAttempts,
    concurrency,
  ]);

  useEffect(() => {
    const currentLimit = Math.min(lockoutThreshold, totalAttempts);
    const delay = computeDelay(attempt, baseDelayMs, backoffThreshold);
    delayRef.current = delay;
    setDelayMs(delay);
    setThroughput(
      computeThroughput(concurrency, delay, Math.max(0, currentLimit - attempt))
    );
  }, [attempt, baseDelayMs, backoffThreshold, lockoutThreshold, totalAttempts, concurrency]);

  useEffect(() => {
    if (!active || locked) return undefined;

    const currentLimit = Math.min(lockoutThreshold, totalAttempts);
    if (attempt >= currentLimit) {
      return undefined;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      const final = currentLimit;
      const batchSize = final - attempt;
      for (let i = attempt + 1; i <= final; i += 1) {
        onAttemptChange({
          attempt: i,
          throughput: 0,
          delayMs: 0,
          batchSize,
        });
      }
      setAttempt(final);
      setDelayMs(0);
      delayRef.current = 0;
      setThroughput(0);
      if (final >= lockoutThreshold) {
        setLocked(true);
      }
      return undefined;
    }

    const tick = () => {
      requestAnimationFrame(() => {
        setAttempt((prev) => {
          const limitWithinTick = Math.min(lockoutThreshold, totalAttempts);
          if (prev >= limitWithinTick) {
            return prev;
          }

          const currentDelay =
            typeof delayRef.current === 'number'
              ? delayRef.current
              : computeDelay(prev, baseDelayMs, backoffThreshold);

          const available = limitWithinTick - prev;
          const batchSize = Math.min(concurrency, available);
          const rate = computeThroughput(concurrency, currentDelay, available);
          if (batchSize > 0) {
            setThroughput(rate);
          }

          let next = prev;
          let lockedOut = false;

          for (let i = 0; i < batchSize; i += 1) {
            next += 1;
            onAttemptChange({
              attempt: next,
              throughput: rate,
              delayMs: currentDelay,
              batchSize,
            });
            if (next >= lockoutThreshold || next >= totalAttempts) {
              lockedOut = next >= lockoutThreshold;
              break;
            }
          }

          if (lockedOut || next >= limitWithinTick) {
            if (lockedOut) {
              setLocked(true);
            }
            delayRef.current = 0;
            setDelayMs(0);
            setThroughput(0);
            return next;
          }

          const nextDelay = computeDelay(next, baseDelayMs, backoffThreshold);
          delayRef.current = nextDelay;
          setDelayMs(nextDelay);
          setThroughput(
            computeThroughput(
              concurrency,
              nextDelay,
              Math.max(0, limitWithinTick - next)
            )
          );
          timerRef.current = setTimeout(tick, nextDelay);
          return next;
        });
      });
    };

    const initialTimeoutDelay =
      typeof delayRef.current === 'number'
        ? delayRef.current
        : computeDelay(attempt, baseDelayMs, backoffThreshold);

    timerRef.current = setTimeout(tick, initialTimeoutDelay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    active,
    locked,
    backoffThreshold,
    lockoutThreshold,
    totalAttempts,
    runId,
    concurrency,
    baseDelayMs,
    onAttemptChange,
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
          <div className="text-xs text-blue-300 mt-1">
            Concurrency: {concurrency} | Throughput: {throughput.toFixed(1)} attempts/s
          </div>
          <div className="mt-2 w-full bg-gray-700 h-2 rounded">
            <div
              data-testid="backoff-bar"
              className="bg-yellow-500 h-2 rounded"
              style={{ width: `${(delayMs / MAX_DELAY_MS) * 100}%` }}
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
