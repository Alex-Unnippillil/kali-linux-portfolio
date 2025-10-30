let running = false;
let timer: number | null = null;
let last = 0;
let frameInterval = 16;

const schedule = () => {
  if (!running) return;
  timer = (self as any).setTimeout(() => {
    const now = performance.now();
    const delta = (now - last) / 1000;
    last = now;
    (self as any).postMessage({ type: 'tick', delta });
    schedule();
  }, frameInterval);
};

const stop = () => {
  running = false;
  if (timer !== null) {
    (self as any).clearTimeout(timer);
    timer = null;
  }
};

self.onmessage = (event: MessageEvent) => {
  const data = event.data || {};
  switch (data.type) {
    case 'start': {
      frameInterval = typeof data.interval === 'number' ? data.interval : 16;
      stop();
      running = true;
      last = performance.now();
      schedule();
      break;
    }
    case 'stop': {
      stop();
      break;
    }
    case 'step': {
      const ms = typeof data.delta === 'number' ? data.delta : frameInterval;
      (self as any).postMessage({ type: 'tick', delta: ms / 1000 });
      break;
    }
    default:
      break;
  }
};

export {};
