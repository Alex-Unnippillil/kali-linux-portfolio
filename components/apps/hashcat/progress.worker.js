import { TICK_INTERVAL_MS } from './smoothing';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

self.onmessage = (event) => {
  const { cancel, target = 100 } = event.data ?? {};
  if (cancel) {
    return;
  }

  const total = Math.max(1, target);
  let current = 0;
  const start = Date.now();

  const tick = () => {
    current = clamp(current + 1, 0, total);
    const elapsedMs = Date.now() - start;
    const remaining = Math.max(0, total - current);
    const etaSeconds = (remaining * TICK_INTERVAL_MS) / 1000;
    const attemptsPerSecond = current
      ? (current / Math.max(1, elapsedMs)) * 1000
      : 0;

    const payload = {
      progress: current,
      etaSeconds,
      attemptsPerSecond,
      complete: current >= total,
    };

    self.postMessage(payload);

    if (payload.complete) {
      return;
    }

    setTimeout(tick, TICK_INTERVAL_MS);
  };

  tick();
};
