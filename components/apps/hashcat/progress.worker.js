let current = 0;
let target = 100;
let stepDelay = 100;
let running = false;
let timer = null;

const emitProgress = () => {
  self.postMessage({ type: 'progress', current, target });
};

const clearTimer = () => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
};

const scheduleTick = () => {
  clearTimer();
  if (!running) return;
  timer = setTimeout(tick, stepDelay);
};

const tick = () => {
  if (!running) return;
  current = Math.min(target, current + 1);
  emitProgress();
  if (current >= target) {
    running = false;
    self.postMessage({ type: 'complete', current, target });
    clearTimer();
    return;
  }
  scheduleTick();
};

self.onmessage = (event) => {
  const data = event.data || {};
  switch (data.type) {
    case 'start':
      target = typeof data.target === 'number' ? data.target : target;
      current = typeof data.startAt === 'number' ? data.startAt : 0;
      stepDelay = typeof data.stepDelay === 'number' ? data.stepDelay : 100;
      running = true;
      emitProgress();
      scheduleTick();
      break;
    case 'resume':
      if (!running) {
        running = true;
        emitProgress();
        scheduleTick();
      }
      break;
    case 'pause':
      running = false;
      clearTimer();
      break;
    case 'cancel':
      running = false;
      clearTimer();
      current = 0;
      break;
    case 'snapshot':
      self.postMessage({
        type: 'snapshot',
        payload: { current, target, stepDelay },
      });
      break;
    default:
      break;
  }
};
